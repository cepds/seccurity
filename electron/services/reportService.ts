import { filterAlerts } from "../../backend/db/repositories/alertsRepo";
import { getWorkspaceSessionById } from "../../backend/db/repositories/sessionsRepo";
import { getEventsBySessionId } from "./eventService";
import type { SessionReportSnapshot } from "../../shared/types";

export function buildSessionReportSnapshot(sessionId: string): SessionReportSnapshot {
  const session = getWorkspaceSessionById(sessionId);

  if (!session) {
    throw new Error(`Sessao nao encontrada para relatorio: ${sessionId}`);
  }

  return {
    session,
    alerts: filterAlerts({
      sessionId,
      limit: 500,
    }),
    events: getEventsBySessionId(sessionId, 500),
    generatedAt: new Date().toISOString(),
  };
}
