import type { AlertRecord, StandardizedEvent, WorkspaceSession } from "../shared/types";

export interface CorrelationAlertCandidate {
  timestamp?: string;
  title: string;
  severity: AlertRecord["severity"];
  source: string;
  relatedEventIds: number[];
  data: Record<string, unknown>;
}

function getRelatedToolLabel(event: StandardizedEvent): string {
  if (typeof event.data.toolName === "string" && event.data.toolName.trim()) {
    return event.data.toolName;
  }

  if (typeof event.data.toolId === "string" && event.data.toolId.trim()) {
    return event.data.toolId;
  }

  return event.target;
}

function buildLaunchFailureAlerts(
  session: WorkspaceSession,
  events: StandardizedEvent[]
): CorrelationAlertCandidate[] {
  return events
    .filter((event) => event.type === "workspace.session.tool.launch.failed")
    .map((event) => ({
      timestamp: event.timestamp,
      title: `Falha ao abrir ${getRelatedToolLabel(event)}`,
      severity: "high",
      source: "correlation.launch-failure",
      relatedEventIds: [event.id],
      data: {
        sessionId: session.id,
        workspaceId: session.workspaceId,
        workspaceName: session.workspaceName,
        rule: "launch-failure",
        eventType: event.type,
        toolId: event.data.toolId ?? null,
      },
    }));
}

function buildHighSeverityAlerts(
  session: WorkspaceSession,
  events: StandardizedEvent[]
): CorrelationAlertCandidate[] {
  return events
    .filter(
      (event) =>
        (event.severity === "high" || event.severity === "critical") &&
        event.type !== "workspace.session.tool.launch.failed"
    )
    .map((event) => ({
      timestamp: event.timestamp,
      title: `Evento ${event.severity} detectado em ${event.source}`,
      severity: event.severity,
      source: "correlation.high-severity",
      relatedEventIds: [event.id],
      data: {
        sessionId: session.id,
        workspaceId: session.workspaceId,
        workspaceName: session.workspaceName,
        rule: "high-severity-event",
        eventType: event.type,
        target: event.target,
      },
    }));
}

function buildNoLaunchAlert(
  session: WorkspaceSession,
  events: StandardizedEvent[]
): CorrelationAlertCandidate[] {
  const openedToolEvents = events.filter((event) => event.type === "workspace.session.tool.opened");
  if (openedToolEvents.length > 0) {
    return [];
  }

  return [
    {
      timestamp: session.startedAt,
      title: "Sessao sem apps iniciados",
      severity: "medium",
      source: "correlation.no-launch",
      relatedEventIds: events.map((event) => event.id),
      data: {
        sessionId: session.id,
        workspaceId: session.workspaceId,
        workspaceName: session.workspaceName,
        rule: "no-tools-opened",
        observedEventCount: events.length,
      },
    },
  ];
}

function dedupeCandidates(candidates: CorrelationAlertCandidate[]): CorrelationAlertCandidate[] {
  const seenKeys = new Set<string>();

  return candidates.filter((candidate) => {
    const key = `${candidate.source}|${candidate.title}|${candidate.relatedEventIds.join(",")}`;
    if (seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
}

export function correlateSession(
  session: WorkspaceSession,
  events: StandardizedEvent[]
): CorrelationAlertCandidate[] {
  const sortedEvents = [...events].sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );

  return dedupeCandidates([
    ...buildLaunchFailureAlerts(session, sortedEvents),
    ...buildHighSeverityAlerts(session, sortedEvents),
    ...buildNoLaunchAlert(session, sortedEvents),
  ]);
}
