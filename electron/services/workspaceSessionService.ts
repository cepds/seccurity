import { correlateSession } from "../../backend/correlationEngine";
import {
  countAlerts,
  createAlert,
  deleteAlertsBySessionId,
  listAlerts,
} from "../../backend/db/repositories/alertsRepo";
import {
  countActiveWorkspaceSessions,
  createWorkspaceSession,
  finishWorkspaceSession,
  getWorkspaceSessionById,
  listWorkspaceSessions,
} from "../../backend/db/repositories/sessionsRepo";
import { getWorkspaceById } from "../../backend/db/repositories/workspacesRepo";
import { getEventsBySessionId, recordStandardizedEvent } from "./eventService";
import { logEvent } from "./logger";
import type {
  AlertRecord,
  FinishWorkspaceSessionResult,
  WorkspaceSession,
} from "../../shared/types";

function buildWorkspaceSessionName(workspaceName: string): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
  return `${workspaceName} @ ${timestamp}`;
}

function recordWorkspaceSessionEvent(
  type: string,
  severity: "info" | "low" | "medium" | "high" | "critical",
  target: string,
  data: Record<string, unknown>
): number {
  return recordStandardizedEvent({
    source: "workspace-session",
    type,
    target,
    severity,
    data,
  });
}

export function startSession(workspaceId: string): WorkspaceSession {
  const workspace = getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new Error(`Workspace nao encontrado para iniciar sessao: ${workspaceId}`);
  }

  const session = createWorkspaceSession({
    name: buildWorkspaceSessionName(workspace.name),
    workspaceId: workspace.id,
    status: "active",
  });

  recordWorkspaceSessionEvent("workspace.session.started", "info", workspace.id, {
    sessionId: session.id,
    sessionName: session.name,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  });

  logEvent("info", "workspace.session", "Sessao de workspace iniciada.", {
    sessionId: session.id,
    sessionName: session.name,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  });

  return session;
}

export function runCorrelation(sessionId: string): AlertRecord[] {
  const session = getWorkspaceSessionById(sessionId);
  if (!session) {
    throw new Error(`Sessao nao encontrada para correlacao: ${sessionId}`);
  }

  const sessionEvents = getEventsBySessionId(sessionId, 400);
  deleteAlertsBySessionId(sessionId);

  const candidates = correlateSession(session, sessionEvents);
  const alerts = candidates.map((candidate) =>
    createAlert({
      timestamp: candidate.timestamp,
      title: candidate.title,
      severity: candidate.severity,
      source: candidate.source,
      relatedEventIds: candidate.relatedEventIds,
      data: {
        ...candidate.data,
        sessionId: session.id,
        sessionName: session.name,
      },
    })
  );

  logEvent("info", "correlation", "Correlacao executada para sessao de workspace.", {
    sessionId: session.id,
    eventCount: sessionEvents.length,
    alertCount: alerts.length,
  });

  return alerts;
}

export function finishSession(sessionId: string): FinishWorkspaceSessionResult {
  const session = getWorkspaceSessionById(sessionId);
  if (!session) {
    throw new Error(`Sessao nao encontrada: ${sessionId}`);
  }

  const finishedSession = finishWorkspaceSession(sessionId, "finished");

  recordWorkspaceSessionEvent(
    "workspace.session.finished",
    "info",
    finishedSession.workspaceId ?? "workspace-session",
    {
      sessionId: finishedSession.id,
      sessionName: finishedSession.name,
      workspaceId: finishedSession.workspaceId,
      workspaceName: finishedSession.workspaceName,
      finishedAt: finishedSession.finishedAt,
    }
  );

  const alerts = runCorrelation(sessionId);

  logEvent("success", "workspace.session", "Sessao de workspace encerrada.", {
    sessionId: finishedSession.id,
    workspaceId: finishedSession.workspaceId,
    alertCount: alerts.length,
  });

  return {
    session: finishedSession,
    alertCount: alerts.length,
    message: `Sessao ${finishedSession.name} encerrada.`,
  };
}

export {
  countActiveWorkspaceSessions,
  countAlerts,
  getWorkspaceSessionById,
  listAlerts,
  listWorkspaceSessions,
};
