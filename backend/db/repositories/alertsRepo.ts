import { getDatabase } from "../db";
import type { AlertRecord, EventSeverity } from "../../../shared/types";

interface AlertRow {
  id: number;
  timestamp: string;
  title: string;
  severity: EventSeverity;
  source: string;
  related_event_ids_json: string;
  data_json: string;
  created_at: string;
}

export interface CreateAlertInput {
  timestamp?: string;
  title: string;
  severity: EventSeverity;
  source: string;
  relatedEventIds: number[];
  data: Record<string, unknown>;
}

export interface AlertFilters {
  severity?: EventSeverity;
  sessionId?: string;
  limit?: number;
}

function mapAlertRow(row: AlertRow): AlertRecord {
  return {
    id: row.id,
    timestamp: row.timestamp,
    title: row.title,
    severity: row.severity,
    source: row.source,
    relatedEventIds: JSON.parse(row.related_event_ids_json) as number[],
    data: JSON.parse(row.data_json) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

export function createAlert(input: CreateAlertInput): AlertRecord {
  const database = getDatabase();
  const timestamp = input.timestamp ?? new Date().toISOString();

  const result = database
    .prepare(
      `
        INSERT INTO alerts (
          timestamp,
          title,
          severity,
          source,
          related_event_ids_json,
          data_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      timestamp,
      input.title,
      input.severity,
      input.source,
      JSON.stringify(input.relatedEventIds),
      JSON.stringify(input.data),
      timestamp
    );

  const row = database
    .prepare(
      `
        SELECT id, timestamp, title, severity, source, related_event_ids_json, data_json, created_at
        FROM alerts
        WHERE id = ?
      `
    )
    .get(Number(result.lastInsertRowid)) as AlertRow | undefined;

  if (!row) {
    throw new Error("Falha ao recuperar o alerta salvo.");
  }

  return mapAlertRow(row);
}

export function listAlerts(limit = 120): AlertRecord[] {
  const database = getDatabase();
  const rows = database
    .prepare(
      `
        SELECT id, timestamp, title, severity, source, related_event_ids_json, data_json, created_at
        FROM alerts
        ORDER BY datetime(timestamp) DESC, id DESC
        LIMIT ?
      `
    )
    .all(limit) as AlertRow[];

  return rows.map(mapAlertRow);
}

export function filterAlerts(filters: AlertFilters = {}): AlertRecord[] {
  const database = getDatabase();
  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (filters.severity) {
    conditions.push("severity = ?");
    values.push(filters.severity);
  }

  if (filters.sessionId) {
    conditions.push("json_extract(data_json, '$.sessionId') = ?");
    values.push(filters.sessionId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit ?? 120;
  values.push(limit);

  const rows = database
    .prepare(
      `
        SELECT id, timestamp, title, severity, source, related_event_ids_json, data_json, created_at
        FROM alerts
        ${whereClause}
        ORDER BY datetime(timestamp) DESC, id DESC
        LIMIT ?
      `
    )
    .all(...values) as AlertRow[];

  return rows.map(mapAlertRow);
}

export function deleteAlertsBySessionId(sessionId: string): void {
  const database = getDatabase();
  database
    .prepare(
      `
        DELETE FROM alerts
        WHERE json_extract(data_json, '$.sessionId') = ?
      `
    )
    .run(sessionId);
}

export function countAlerts(): number {
  const database = getDatabase();
  const row = database.prepare("SELECT COUNT(*) AS count FROM alerts").get() as { count: number };
  return row.count;
}
