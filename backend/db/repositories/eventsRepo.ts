import { getDatabase } from "../db";
import type { EventSeverity } from "../../../shared/types";

export interface EventRecord {
  id: number;
  timestamp: string;
  source: string;
  type: string;
  target: string;
  severity: EventSeverity;
  data_json: string;
}

export interface CreateEventInput {
  timestamp?: string;
  source: string;
  type: string;
  target: string;
  severity: EventSeverity;
  data_json: string;
}

export interface EventFilters {
  ids?: number[];
  source?: string;
  type?: string;
  target?: string;
  severity?: EventSeverity;
  sessionId?: string;
  limit?: number;
}

function mapRow(row: EventRecord): EventRecord {
  return {
    id: row.id,
    timestamp: row.timestamp,
    source: row.source,
    type: row.type,
    target: row.target,
    severity: row.severity,
    data_json: row.data_json,
  };
}

export function createEvent(input: CreateEventInput): EventRecord {
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
      input.data_json,
      timestamp
    );

  const row = database
    .prepare(
      `
        SELECT id, timestamp, source, type, target, severity, data_json
        FROM events
        WHERE id = ?
      `
    )
    .get(Number(result.lastInsertRowid)) as EventRecord | undefined;

  if (!row) {
    throw new Error("Falha ao recuperar o evento salvo.");
  }

  return mapRow(row);
}

export function listEvents(limit = 100): EventRecord[] {
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
    .all(limit) as EventRecord[];

  return rows.map(mapRow);
}

export function filterEvents(filters: EventFilters = {}): EventRecord[] {
  const database = getDatabase();
  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (filters.ids?.length) {
    const placeholders = filters.ids.map(() => "?").join(", ");
    conditions.push(`id IN (${placeholders})`);
    values.push(...filters.ids);
  }

  if (filters.source) {
    conditions.push("source = ?");
    values.push(filters.source);
  }

  if (filters.type) {
    conditions.push("type = ?");
    values.push(filters.type);
  }

  if (filters.target) {
    conditions.push("target = ?");
    values.push(filters.target);
  }

  if (filters.severity) {
    conditions.push("severity = ?");
    values.push(filters.severity);
  }

  if (filters.sessionId) {
    conditions.push("json_extract(data_json, '$.sessionId') = ?");
    values.push(filters.sessionId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit ?? 100;
  values.push(limit);

  const rows = database
    .prepare(
      `
        SELECT id, timestamp, source, type, target, severity, data_json
        FROM events
        ${whereClause}
        ORDER BY datetime(timestamp) DESC, id DESC
        LIMIT ?
      `
    )
    .all(...values) as EventRecord[];

  return rows.map(mapRow);
}

export function listEventsBySessionId(sessionId: string, limit = 300): EventRecord[] {
  return filterEvents({
    sessionId,
    limit,
  });
}

export function getEventsByIds(ids: number[]): EventRecord[] {
  if (ids.length === 0) {
    return [];
  }

  return filterEvents({
    ids,
    limit: ids.length,
  });
}

export function countEvents(): number {
  const database = getDatabase();
  const row = database.prepare("SELECT COUNT(*) AS count FROM events").get() as { count: number };
  return row.count;
}
