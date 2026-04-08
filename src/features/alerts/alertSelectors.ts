import type { AlertRecord, EventSeverity, StandardizedEvent } from "../../../shared/types";

export interface AlertDetail {
  alert: AlertRecord;
  relatedEvents: StandardizedEvent[];
}

export function buildAlertSeverityOptions(alerts: AlertRecord[]): EventSeverity[] {
  return Array.from(new Set(alerts.map((alert) => alert.severity))).sort() as EventSeverity[];
}

export function filterAlertsBySeverity(
  alerts: AlertRecord[],
  severity: EventSeverity | ""
): AlertRecord[] {
  return [...alerts]
    .filter((alert) => (severity ? alert.severity === severity : true))
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
}

export function getAlertDetail(
  alertId: number,
  alerts: AlertRecord[],
  events: StandardizedEvent[]
): AlertDetail | null {
  const alert = alerts.find((entry) => entry.id === alertId);
  if (!alert) {
    return null;
  }

  const relatedEvents = events
    .filter((event) => alert.relatedEventIds.includes(event.id))
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

  return {
    alert,
    relatedEvents,
  };
}
