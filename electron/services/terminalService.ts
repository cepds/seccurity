import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { webContents } from "electron";
import type { IPty } from "node-pty";
import { terminalChannels } from "./ipcChannels";
import { logEvent } from "./logger";
import type {
  TerminalExitEvent,
  TerminalOutputChunk,
  TerminalSessionInfo,
} from "../../shared/types";

interface TerminalSessionRecord {
  info: TerminalSessionInfo;
  ownerWebContentsId: number;
  pty: IPty;
}

const DEFAULT_COLS = 120;
const DEFAULT_ROWS = 32;

const terminalSessions = new Map<string, TerminalSessionRecord>();
let nodePtyModulePromise: Promise<typeof import("node-pty")> | null = null;

async function getNodePtyModule(): Promise<typeof import("node-pty")> {
  if (!nodePtyModulePromise) {
    nodePtyModulePromise = import("node-pty");
  }

  return nodePtyModulePromise;
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

  const nodePty = await getNodePtyModule();
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
