import {
  createEvent,
  getEventsByIds as getEventsByIdsFromRepo,
  filterEvents as filterEventsFromRepo,
  listEventsBySessionId as listEventsBySessionIdFromRepo,
  listEvents as listEventsFromRepo,
} from "../../backend/db/repositories/eventsRepo";
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
  return createEvent({
    timestamp: input.timestamp,
    source: input.source,
    type: input.type,
    target: input.target,
    severity: input.severity,
    data_json: JSON.stringify(input.data),
  }).id;
}

export function getEvents(limit = 100): StandardizedEvent[] {
  return listEventsFromRepo(limit).map(toEvent);
}

export function filterEvents(filters: {
  ids?: number[];
  source?: string;
  type?: string;
  target?: string;
  severity?: EventSeverity;
  sessionId?: string;
  limit?: number;
}): StandardizedEvent[] {
  return filterEventsFromRepo(filters).map(toEvent);
}

export function getEventsBySessionId(sessionId: string, limit = 300): StandardizedEvent[] {
  return listEventsBySessionIdFromRepo(sessionId, limit).map(toEvent);
}

export function getEventsByIds(ids: number[]): StandardizedEvent[] {
  return getEventsByIdsFromRepo(ids).map(toEvent);
}

export function countEvents(): number {
  const row = listEventsFromRepo(1_000_000);

  return row.length;
}
