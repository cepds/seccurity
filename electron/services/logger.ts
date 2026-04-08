import { getDatabase } from "./database";
import { buildEventFromLog, recordStandardizedEvent } from "./eventService";
import type { AppLogEntry, LogLevel } from "../../shared/types";

interface LogRow {
  id: number;
  level: LogLevel;
  scope: string;
  message: string;
  metadata_json: string | null;
  created_at: string;
}

export function logEvent(
  level: LogLevel,
  scope: string,
  message: string,
  metadata: Record<string, unknown> | null = null
): void {
  const database = getDatabase();
  const timestamp = new Date().toISOString();

  database
    .prepare(
      `
        INSERT INTO app_logs (level, scope, message, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?)
      `
    )
    .run(level, scope, message, metadata ? JSON.stringify(metadata) : null, timestamp);

  recordStandardizedEvent(
    buildEventFromLog(level, scope, message, {
      ...(metadata ?? {}),
      logLevel: level,
      loggedAt: timestamp,
    })
  );
}

export function getLogs(limit = 100): AppLogEntry[] {
  const database = getDatabase();
  const rows = database
    .prepare(
      `
        SELECT id, level, scope, message, metadata_json, created_at
        FROM app_logs
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ?
      `
    )
    .all(limit) as LogRow[];

  return rows.map((row) => ({
    id: row.id,
    level: row.level,
    scope: row.scope,
    message: row.message,
    metadata: row.metadata_json ? (JSON.parse(row.metadata_json) as Record<string, unknown>) : null,
    createdAt: row.created_at,
  }));
}
