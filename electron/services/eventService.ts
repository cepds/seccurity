import { getDatabase } from "./database";
import type {
  EventSeverity,
  LogLevel,
  StandardizedEvent,
} from "../../shared/types";

interface StandardizedEventRow {
  id: number;
  timestamp: string;
  source: string;
  type: string;
  target: string;
  severity: EventSeverity;
  data_json: string;
}

interface EventInput {
  timestamp?: string;
  source: string;
  type: string;
  target: string;
  severity: EventSeverity;
  data: Record<string, unknown>;
}

function toEvent(row: StandardizedEventRow): StandardizedEvent {
  return {
    id: row.id,
    timestamp: row.timestamp,
    source: row.source,
    type: row.type,
    target: row.target,
    severity: row.severity,
    data: JSON.parse(row.data_json) as Record<string, unknown>,
  };
}

function levelToSeverity(level: LogLevel): EventSeverity {
  switch (level) {
    case "error":
      return "high";
    case "warn":
      return "medium";
    case "success":
      return "low";
    case "info":
    default:
      return "info";
  }
}

export function buildEventFromLog(
  level: LogLevel,
  scope: string,
  message: string,
  metadata: Record<string, unknown> | null
): EventInput {
  const target =
    typeof metadata?.toolId === "string"
      ? metadata.toolId
      : typeof metadata?.workspaceId === "string"
        ? metadata.workspaceId
        : "application";

  return {
    timestamp: new Date().toISOString(),
    source: scope,
    type: `${scope}.log`,
    target,
    severity: levelToSeverity(level),
    data: {
      message,
      ...(metadata ?? {}),
    },
  };
}

export function recordStandardizedEvent(input: EventInput): number {
  const database = getDatabase();
  const timestamp = input.timestamp ?? new Date().toISOString();

  const result = database
    .prepare(
      `
        INSERT INTO events (timestamp, source, type, target, severity, data_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      timestamp,
      input.source,
      input.type,
      input.target,
      input.severity,
      JSON.stringify(input.data),
      timestamp
    );

  return Number(result.lastInsertRowid);
}

export function getEvents(limit = 100): StandardizedEvent[] {
  const database = getDatabase();
  const rows = database
    .prepare(
      `
        SELECT id, timestamp, source, type, target, severity, data_json
        FROM events
        ORDER BY datetime(timestamp) DESC, id DESC
        LIMIT ?
      `
    )
    .all(limit) as StandardizedEventRow[];

  return rows.map(toEvent);
}

export function countEvents(): number {
  const database = getDatabase();
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM events")
    .get() as { count: number };

  return row.count;
}
