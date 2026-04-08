import type { AlertRecord, StandardizedEvent, WorkspaceSession } from "../../../shared/types";

export interface SessionListItem extends WorkspaceSession {
  alertCount: number;
  eventCount: number;
}

export interface SessionDetail {
  session: WorkspaceSession;
  relatedAlerts: AlertRecord[];
  relatedEvents: StandardizedEvent[];
}

function getSessionIdFromAlert(alert: AlertRecord): string | null {
  return typeof alert.data.sessionId === "string" ? alert.data.sessionId : null;
}

function getSessionIdFromEvent(event: StandardizedEvent): string | null {
  return typeof event.data.sessionId === "string" ? event.data.sessionId : null;
}

function sortByTimestampDesc<T extends { timestamp?: string; startedAt?: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftTimestamp = new Date(left.timestamp ?? left.startedAt ?? 0).getTime();
    const rightTimestamp = new Date(right.timestamp ?? right.startedAt ?? 0).getTime();
    return rightTimestamp - leftTimestamp;
  });
}

export function buildSessionListItems(
  sessions: WorkspaceSession[],
  alerts: AlertRecord[],
  events: StandardizedEvent[]
): SessionListItem[] {
  return sortByTimestampDesc(sessions).map((session) => ({
    ...session,
    alertCount: alerts.filter((alert) => getSessionIdFromAlert(alert) === session.id).length,
    eventCount: events.filter((event) => getSessionIdFromEvent(event) === session.id).length,
  }));
}

export function getSessionDetail(
  sessionId: string,
  sessions: WorkspaceSession[],
  alerts: AlertRecord[],
  events: StandardizedEvent[]
): SessionDetail | null {
  const session = sessions.find((entry) => entry.id === sessionId);
  if (!session) {
    return null;
  }

  return {
    session,
    relatedAlerts: sortByTimestampDesc(
      alerts.filter((alert) => getSessionIdFromAlert(alert) === session.id)
    ),
    relatedEvents: sortByTimestampDesc(
      events.filter((event) => getSessionIdFromEvent(event) === session.id)
    ),
  };
}
