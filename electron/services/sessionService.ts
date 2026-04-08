import { randomUUID } from "node:crypto";
import { getDatabase } from "./database";
import type { AppSession, AppSessionStatus, ToolId } from "../../shared/types";

interface SessionRow {
  id: string;
  tool_id: ToolId;
  workspace_id: string | null;
  executable_path: string | null;
  launch_source: string;
  status: AppSessionStatus;
  started_at: string;
  ended_at: string | null;
  pid: number | null;
  exit_code: number | null;
  metadata_json: string | null;
}

function toSession(row: SessionRow): AppSession {
  return {
    id: row.id,
    toolId: row.tool_id,
    workspaceId: row.workspace_id,
    executablePath: row.executable_path,
    launchSource: row.launch_source,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    pid: row.pid,
    exitCode: row.exit_code,
    metadata: row.metadata_json ? (JSON.parse(row.metadata_json) as Record<string, unknown>) : null,
  };
}

export interface CreateSessionInput {
  toolId: ToolId;
  workspaceId?: string | null;
  executablePath?: string | null;
  launchSource: string;
  status: AppSessionStatus;
  pid?: number | null;
  metadata?: Record<string, unknown> | null;
}

export function createSession(input: CreateSessionInput): AppSession {
  const database = getDatabase();
  const session: AppSession = {
    id: randomUUID(),
    toolId: input.toolId,
    workspaceId: input.workspaceId ?? null,
    executablePath: input.executablePath ?? null,
    launchSource: input.launchSource,
    status: input.status,
    startedAt: new Date().toISOString(),
    endedAt: null,
    pid: input.pid ?? null,
    exitCode: null,
    metadata: input.metadata ?? null,
  };

  database
    .prepare(
      `
        INSERT INTO app_sessions (
          id,
          tool_id,
          workspace_id,
          executable_path,
          launch_source,
          status,
          started_at,
          ended_at,
          pid,
          exit_code,
          metadata_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      session.id,
      session.toolId,
      session.workspaceId,
      session.executablePath,
      session.launchSource,
      session.status,
      session.startedAt,
      session.endedAt,
      session.pid,
      session.exitCode,
      session.metadata ? JSON.stringify(session.metadata) : null
    );

  return session;
}

export function listSessions(limit = 100): AppSession[] {
  const database = getDatabase();
  const rows = database
    .prepare(
      `
        SELECT
          id,
          tool_id,
          workspace_id,
          executable_path,
          launch_source,
          status,
          started_at,
          ended_at,
          pid,
          exit_code,
          metadata_json
        FROM app_sessions
        ORDER BY datetime(started_at) DESC, id DESC
        LIMIT ?
      `
    )
    .all(limit) as SessionRow[];

  return rows.map(toSession);
}

export function countActiveSessions(): number {
  const database = getDatabase();
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM app_sessions WHERE status = 'active'")
    .get() as { count: number };

  return row.count;
}
