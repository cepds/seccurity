import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { webContents } from "electron";
import { terminalChannels } from "./ipcChannels";
import { logEvent } from "./logger";
import type {
  FeatureAvailability,
  TerminalExitEvent,
  TerminalOutputChunk,
  TerminalSessionInfo,
} from "../../shared/types";

type TerminalBackendKind = "disabled" | "powershell-stdio" | "node-pty";

interface PtyExitPayload {
  exitCode: number;
  signal?: number;
}

interface PtyProcess {
  onData(listener: (data: string) => void): void;
  onExit(listener: (payload: PtyExitPayload) => void): void;
  write(data: string): void;
  kill(): void;
}

interface NodePtyModule {
  spawn(
    file: string,
    args: string[],
    options: {
      name: string;
      cols: number;
      rows: number;
      cwd: string;
      env: Record<string, string>;
    }
  ): PtyProcess;
}

interface TerminalRuntime {
  kind: Exclude<TerminalBackendKind, "disabled">;
  write(data: string): void;
  kill(): void;
  onOutput(listener: (text: string, stream: TerminalOutputChunk["stream"]) => void): void;
  onExit(listener: (exitCode: number, signal: number | null) => void): void;
}

interface TerminalSessionRecord {
  info: TerminalSessionInfo;
  ownerWebContentsId: number;
  runtime: TerminalRuntime;
}

interface TerminalBackendAvailability {
  kind: TerminalBackendKind;
  reason: string | null;
}

const DEFAULT_COLS = 120;
const DEFAULT_ROWS = 32;
const CONSOLE_DISABLED_MESSAGE =
  "Console integrado desativado por configuracao. Defina ENABLE_CONSOLE=true para reativar o terminal.";
const CONSOLE_POWERSHELL_UNAVAILABLE_MESSAGE =
  "PowerShell nao foi encontrado no sistema para iniciar o console integrado.";
const runtimeRequire = createRequire(__filename);
const ENABLE_CONSOLE = process.env.ENABLE_CONSOLE !== "false";
const PREFERRED_BACKEND = process.env.SECCURITY_CONSOLE_BACKEND ?? "powershell-stdio";

const terminalSessions = new Map<string, TerminalSessionRecord>();
let nodePtyModule: NodePtyModule | null = null;
let nodePtyLoadAttempted = false;

function buildEnvironment(): Record<string, string> {
  const nextEnv: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      nextEnv[key] = value;
    }
  }

  return nextEnv;
}

function getDefaultWorkingDirectory(cwd?: string): string {
  if (cwd && fs.existsSync(cwd)) {
    return cwd;
  }

  return process.env.USERPROFILE ?? os.homedir();
}

function getPowerShellExecutable(): string | null {
  if (process.platform !== "win32") {
    return "powershell";
  }

  const systemRoot = process.env.SystemRoot;
  if (!systemRoot) {
    return null;
  }

  const shellPath = path.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  return fs.existsSync(shellPath) ? shellPath : null;
}

function tryLoadNodePtyModule(): NodePtyModule | null {
  if (nodePtyLoadAttempted) {
    return nodePtyModule;
  }

  nodePtyLoadAttempted = true;

  try {
    nodePtyModule = runtimeRequire("node-pty") as NodePtyModule;
  } catch {
    nodePtyModule = null;
  }

  return nodePtyModule;
}

function createNodePtyRuntime(shellPath: string, cwd: string): TerminalRuntime | null {
  const nodePty = tryLoadNodePtyModule();
  if (!nodePty) {
    return null;
  }

  const pty = nodePty.spawn(shellPath, ["-NoLogo"], {
    name: "xterm-color",
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
    cwd,
    env: buildEnvironment(),
  });

  return {
    kind: "node-pty",
    write(data) {
      pty.write(data);
    },
    kill() {
      pty.kill();
    },
    onOutput(listener) {
      pty.onData((data) => {
        listener(data, "stdout");
      });
    },
    onExit(listener) {
      pty.onExit(({ exitCode, signal }) => {
        listener(exitCode, signal ?? null);
      });
    },
  };
}

function createPowerShellStdioRuntime(shellPath: string, cwd: string): TerminalRuntime {
  const child = spawn(
    shellPath,
    ["-NoLogo", "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "-"],
    {
      cwd,
      env: buildEnvironment(),
      stdio: "pipe",
      windowsHide: true,
    }
  ) as ChildProcessWithoutNullStreams;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  return {
    kind: "powershell-stdio",
    write(data) {
      child.stdin.write(data);
    },
    kill() {
      child.kill();
    },
    onOutput(listener) {
      child.stdout.on("data", (data: string) => {
        listener(data, "stdout");
      });

      child.stderr.on("data", (data: string) => {
        listener(data, "stderr");
      });

      child.on("error", (error) => {
        listener(`\r\n[terminal-error] ${error.message}\r\n`, "system");
      });
    },
    onExit(listener) {
      child.on("exit", (exitCode) => {
        listener(exitCode ?? 0, null);
      });
    },
  };
}

function resolveBackendAvailability(): TerminalBackendAvailability {
  if (!ENABLE_CONSOLE) {
    return {
      kind: "disabled",
      reason: CONSOLE_DISABLED_MESSAGE,
    };
  }

  const shellPath = getPowerShellExecutable();
  if (!shellPath) {
    return {
      kind: "disabled",
      reason: CONSOLE_POWERSHELL_UNAVAILABLE_MESSAGE,
    };
  }

  if (PREFERRED_BACKEND === "node-pty" && tryLoadNodePtyModule()) {
    return {
      kind: "node-pty",
      reason: null,
    };
  }

  return {
    kind: "powershell-stdio",
    reason: null,
  };
}

function createTerminalRuntime(cwd: string): TerminalRuntime {
  const availability = resolveBackendAvailability();
  const shellPath = getPowerShellExecutable();

  if (availability.kind === "disabled" || !shellPath) {
    throw new Error(availability.reason ?? CONSOLE_POWERSHELL_UNAVAILABLE_MESSAGE);
  }

  if (availability.kind === "node-pty") {
    const runtime = createNodePtyRuntime(shellPath, cwd);
    if (runtime) {
      return runtime;
    }
  }

  return createPowerShellStdioRuntime(shellPath, cwd);
}

export function getTerminalFeatureAvailability(): FeatureAvailability {
  const availability = resolveBackendAvailability();

  return {
    enabled: availability.kind !== "disabled",
    reason:
      availability.kind === "powershell-stdio"
        ? "Console ativo em modo de compatibilidade PowerShell."
        : availability.reason,
  };
}

function emitToOwner(
  ownerWebContentsId: number,
  channel: string,
  payload: TerminalOutputChunk | TerminalExitEvent
): void {
  const target = webContents.fromId(ownerWebContentsId);
  if (!target || target.isDestroyed()) {
    return;
  }

  target.send(channel, payload);
}

function emitOutput(
  record: TerminalSessionRecord,
  text: string,
  stream: TerminalOutputChunk["stream"]
): void {
  emitToOwner(record.ownerWebContentsId, terminalChannels.output, {
    sessionId: record.info.id,
    text,
    stream,
    timestamp: new Date().toISOString(),
  });
}

function markSessionInactive(sessionId: string): void {
  const current = terminalSessions.get(sessionId);
  if (!current) {
    return;
  }

  terminalSessions.set(sessionId, {
    ...current,
    info: {
      ...current.info,
      isActive: false,
    },
  });
}

function attachSessionListeners(record: TerminalSessionRecord): void {
  record.runtime.onOutput((text, stream) => {
    emitOutput(record, text, stream);
  });

  record.runtime.onExit((exitCode, signal) => {
    markSessionInactive(record.info.id);

    const exitEvent: TerminalExitEvent = {
      sessionId: record.info.id,
      exitCode,
      signal,
      timestamp: new Date().toISOString(),
    };

    emitToOwner(record.ownerWebContentsId, terminalChannels.exit, exitEvent);
    terminalSessions.delete(record.info.id);
    logEvent("info", "terminal", "Sessao PowerShell encerrada.", {
      sessionId: record.info.id,
      exitCode,
      signal,
    });
  });
}

function getActiveSessionForOwner(ownerWebContentsId: number): TerminalSessionRecord | null {
  for (const session of terminalSessions.values()) {
    if (session.ownerWebContentsId === ownerWebContentsId && session.info.isActive) {
      return session;
    }
  }

  return null;
}

function emitTerminalBanner(record: TerminalSessionRecord): void {
  const modeLabel =
    record.runtime.kind === "node-pty"
      ? "PowerShell com backend node-pty"
      : "PowerShell em modo de compatibilidade";

  emitOutput(record, `${modeLabel}\r\nPS ${record.info.cwd}> `, "system");
}

function bootstrapPowerShellSession(record: TerminalSessionRecord): void {
  if (record.runtime.kind !== "powershell-stdio") {
    return;
  }

  record.runtime.write(
    "[Console]::InputEncoding = [System.Text.Encoding]::UTF8; " +
      "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\r\n"
  );
}

export async function createTerminalSession(
  ownerWebContentsId: number,
  cwd?: string
): Promise<TerminalSessionInfo> {
  const existingSession = getActiveSessionForOwner(ownerWebContentsId);
  if (existingSession) {
    return existingSession.info;
  }

  const workingDirectory = getDefaultWorkingDirectory(cwd);
  const startedAt = new Date().toISOString();
  const sessionInfo: TerminalSessionInfo = {
    id: randomUUID(),
    shell: "PowerShell",
    cwd: workingDirectory,
    startedAt,
    isActive: true,
  };

  const record: TerminalSessionRecord = {
    info: sessionInfo,
    ownerWebContentsId,
    runtime: createTerminalRuntime(workingDirectory),
  };

  terminalSessions.set(sessionInfo.id, record);
  attachSessionListeners(record);
  emitTerminalBanner(record);
  bootstrapPowerShellSession(record);

  logEvent("success", "terminal", "Sessao PowerShell iniciada.", {
    sessionId: sessionInfo.id,
    cwd: workingDirectory,
    ownerWebContentsId,
    backend: record.runtime.kind,
  });

  return sessionInfo;
}

export function writeToTerminal(sessionId: string, data: string): void {
  const session = terminalSessions.get(sessionId);
  if (!session || !session.info.isActive) {
    throw new Error("Sessao de terminal indisponivel.");
  }

  const normalizedCommand = data.replace(/\r?\n/g, "").trim();
  if (normalizedCommand) {
    emitOutput(session, `${normalizedCommand}\r\n`, "system");
  }

  session.runtime.write(data);
}

export function stopTerminalSession(sessionId: string): void {
  const session = terminalSessions.get(sessionId);
  if (!session) {
    return;
  }

  session.runtime.kill();
}

export function disposeTerminalSessions(): void {
  for (const session of terminalSessions.values()) {
    session.runtime.kill();
  }

  terminalSessions.clear();
}
