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

interface TerminalSessionRecord {
  info: TerminalSessionInfo;
  ownerWebContentsId: number;
  pty: PtyProcess;
}

const DEFAULT_COLS = 120;
const DEFAULT_ROWS = 32;
const ENABLE_CONSOLE = process.env.ENABLE_CONSOLE === "true";
const CONSOLE_DISABLED_MESSAGE =
  "Console integrado desativado. Defina ENABLE_CONSOLE=true para reativar o backend do terminal.";
const runtimeRequire = createRequire(__filename);

const terminalSessions = new Map<string, TerminalSessionRecord>();
let nodePtyModule: NodePtyModule | null = null;
let nodePtyLoadAttempted = false;
let unavailableReason: string | null = ENABLE_CONSOLE ? null : CONSOLE_DISABLED_MESSAGE;

function loadNodePtyModule(): NodePtyModule | null {
  if (!ENABLE_CONSOLE) {
    return null;
  }

  if (nodePtyLoadAttempted) {
    return nodePtyModule;
  }

  nodePtyLoadAttempted = true;

  try {
    nodePtyModule = runtimeRequire("node-pty") as NodePtyModule;
    unavailableReason = null;
  } catch (error) {
    unavailableReason =
      error instanceof Error
        ? `Console integrado indisponivel: ${error.message}`
        : "Console integrado indisponivel porque o modulo node-pty nao foi carregado.";
  }

  return nodePtyModule;
}

function getRequiredNodePtyModule(): NodePtyModule {
  const module = loadNodePtyModule();
  if (!module) {
    throw new Error(unavailableReason ?? CONSOLE_DISABLED_MESSAGE);
  }

  return module;
}

export function getTerminalFeatureAvailability(): FeatureAvailability {
  const module = loadNodePtyModule();

  return {
    enabled: Boolean(module),
    reason: module ? null : unavailableReason,
  };
}

function buildPtyEnvironment(): Record<string, string> {
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

function getPowerShellExecutable(): string {
  if (process.platform !== "win32") {
    return "powershell";
  }

  const systemRoot = process.env.SystemRoot;
  if (systemRoot) {
    return path.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  }

  return "powershell.exe";
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

function emitOutput(record: TerminalSessionRecord, text: string, stream: TerminalOutputChunk["stream"]): void {
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
  record.pty.onData((data) => {
    emitOutput(record, data, "stdout");
  });

  record.pty.onExit(({ exitCode, signal }) => {
    markSessionInactive(record.info.id);

    const exitEvent: TerminalExitEvent = {
      sessionId: record.info.id,
      exitCode,
      signal: signal ?? null,
      timestamp: new Date().toISOString(),
    };

    emitToOwner(record.ownerWebContentsId, terminalChannels.exit, exitEvent);
    terminalSessions.delete(record.info.id);
    logEvent("info", "terminal", "Sessao PowerShell encerrada.", {
      sessionId: record.info.id,
      exitCode,
      signal: signal ?? null,
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

export async function createTerminalSession(
  ownerWebContentsId: number,
  cwd?: string
): Promise<TerminalSessionInfo> {
  const existingSession = getActiveSessionForOwner(ownerWebContentsId);
  if (existingSession) {
    return existingSession.info;
  }

  const nodePty = getRequiredNodePtyModule();
  const shellPath = getPowerShellExecutable();
  const workingDirectory = getDefaultWorkingDirectory(cwd);
  const startedAt = new Date().toISOString();
  const sessionInfo: TerminalSessionInfo = {
    id: randomUUID(),
    shell: "PowerShell",
    cwd: workingDirectory,
    startedAt,
    isActive: true,
  };

  const pty = nodePty.spawn(shellPath, ["-NoLogo"], {
    name: "xterm-color",
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
    cwd: workingDirectory,
    env: buildPtyEnvironment(),
  });

  const record: TerminalSessionRecord = {
    info: sessionInfo,
    ownerWebContentsId,
    pty,
  };

  terminalSessions.set(sessionInfo.id, record);
  attachSessionListeners(record);
  logEvent("success", "terminal", "Sessao PowerShell iniciada.", {
    sessionId: sessionInfo.id,
    cwd: workingDirectory,
    ownerWebContentsId,
  });

  return sessionInfo;
}

export function writeToTerminal(sessionId: string, data: string): void {
  const session = terminalSessions.get(sessionId);
  if (!session || !session.info.isActive) {
    throw new Error("Sessao de terminal indisponivel.");
  }

  session.pty.write(data);
}

export function stopTerminalSession(sessionId: string): void {
  const session = terminalSessions.get(sessionId);
  if (!session) {
    return;
  }

  session.pty.kill();
}

export function disposeTerminalSessions(): void {
  for (const session of terminalSessions.values()) {
    session.pty.kill();
  }

  terminalSessions.clear();
}
