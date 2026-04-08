import { randomUUID } from "node:crypto";
import { getDatabase } from "../db";
import type { WorkspaceSession, WorkspaceSessionStatus } from "../../../shared/types";

interface SessionRow {
  id: string;
  name: string;
  workspace_id: string | null;
  workspace_name: string | null;
  status: WorkspaceSessionStatus;
  started_at: string;
  finished_at: string | null;
  created_at: string;
}

export interface CreateWorkspaceSessionInput {
  name: string;
  workspaceId?: string | null;
  status?: WorkspaceSessionStatus;
  startedAt?: string;
}

function mapSessionRow(row: SessionRow): WorkspaceSession {
  return {
    id: row.id,
    name: row.name,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
  };
}

function getSessionSelectQuery(): string {
  return `
    SELECT
      sessions.id,
      sessions.name,
      sessions.workspace_id,
      workspaces.name AS workspace_name,
      sessions.status,
      sessions.started_at,
      sessions.finished_at,
      sessions.created_at
    FROM sessions
    LEFT JOIN workspaces ON workspaces.id = sessions.workspace_id
  `;
}

export function createWorkspaceSession(input: CreateWorkspaceSessionInput): WorkspaceSession {
  const database = getDatabase();
  const normalizedName = input.name.trim();

  if (!normalizedName) {
    throw new Error("O nome da sessao nao pode ficar vazio.");
  }

  const startedAt = input.startedAt ?? new Date().toISOString();
  const sessionId = `session-${randomUUID()}`;
  const status = input.status ?? "active";

  database
    .prepare(
      `
        INSERT INTO sessions (id, name, workspace_id, status, started_at, finished_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(sessionId, normalizedName, input.workspaceId ?? null, status, startedAt, null, startedAt);

  const createdSession = getWorkspaceSessionById(sessionId);
  if (!createdSession) {
    throw new Error("Falha ao recuperar a sessao criada.");
  }

  return createdSession;
}

export function getWorkspaceSessionById(sessionId: string): WorkspaceSession | null {
  const database = getDatabase();
  const row = database
    .prepare(
      `
        ${getSessionSelectQuery()}
        WHERE sessions.id = ?
      `
    )
    .get(sessionId) as SessionRow | undefined;

  return row ? mapSessionRow(row) : null;
}

export function listWorkspaceSessions(limit = 120): WorkspaceSession[] {
  const database = getDatabase();
  const rows = database
    .prepare(
      `
        ${getSessionSelectQuery()}
        ORDER BY datetime(sessions.started_at) DESC, sessions.id DESC
        LIMIT ?
      `
    )
    .all(limit) as SessionRow[];

  return rows.map(mapSessionRow);
}

export function finishWorkspaceSession(
  sessionId: string,
  status: WorkspaceSessionStatus = "finished"
): WorkspaceSession {
  const database = getDatabase();
  const session = getWorkspaceSessionById(sessionId);

  if (!session) {
    throw new Error(`Sessao nao encontrada: ${sessionId}`);
  }

  const finishedAt = new Date().toISOString();
  database
    .prepare(
      `
        UPDATE sessions
        SET status = ?, finished_at = ?
        WHERE id = ?
      `
    )
    .run(status, finishedAt, sessionId);

  return (
    getWorkspaceSessionById(sessionId) ?? {
      ...session,
      status,
      finishedAt,
    }
  );
}

export function countActiveWorkspaceSessions(): number {
  const database = getDatabase();
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM sessions WHERE status = 'active'")
    .get() as { count: number };

  return row.count;
}
