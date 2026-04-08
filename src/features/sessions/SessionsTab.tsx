import { useMemo, useState } from "react";
import {
  formatAbsoluteTimestamp,
  formatEventSeverity,
  formatWorkspaceSessionStatus,
} from "../../lib/format";
import { buildSessionListItems, getSessionDetail } from "./sessionSelectors";
import type { AlertRecord, StandardizedEvent, WorkspaceSession } from "../../../shared/types";
import styles from "./SessionsTab.module.css";

interface SessionsTabProps {
  sessions: WorkspaceSession[];
  alerts: AlertRecord[];
  events: StandardizedEvent[];
  finishingSessionId: string | null;
  onFinishSession: (sessionId: string) => Promise<void>;
}

export function SessionsTab({
  sessions,
  alerts,
  events,
  finishingSessionId,
  onFinishSession,
}: SessionsTabProps) {
  const sessionItems = useMemo(
    () => buildSessionListItems(sessions, alerts, events),
    [alerts, events, sessions]
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const effectiveSelectedSessionId =
    selectedSessionId && sessionItems.some((session) => session.id === selectedSessionId)
      ? selectedSessionId
      : (sessionItems[0]?.id ?? null);

  const sessionDetail = useMemo(() => {
    if (!effectiveSelectedSessionId) {
      return null;
    }

    return getSessionDetail(effectiveSelectedSessionId, sessions, alerts, events);
  }, [alerts, effectiveSelectedSessionId, events, sessions]);

  if (sessionItems.length === 0) {
    return <div className={styles.emptyState}>Nenhuma sessao de workspace registrada.</div>;
  }

  return (
    <section className={styles.sessionsTab}>
      <header className={styles.header}>
        <div>
          <p className={styles.sectionLabel}>Sessions</p>
          <h2 className={styles.sectionTitle}>Contextos de execucao vinculados a workspaces</h2>
        </div>
        <span className={styles.count}>{sessionItems.length} sessoes</span>
      </header>

      <div className={styles.layout}>
        <div className={styles.sessionList}>
          {sessionItems.map((session) => (
            <button
              key={session.id}
              type="button"
              className={`${styles.sessionItem} ${
                effectiveSelectedSessionId === session.id ? styles.sessionItemActive : ""
              }`}
              onClick={() => setSelectedSessionId(session.id)}
            >
              <div className={styles.sessionTopline}>
                <strong>{session.name}</strong>
                <span className={styles.statusBadge}>{formatWorkspaceSessionStatus(session.status)}</span>
              </div>
              <span className={styles.workspaceName}>{session.workspaceName ?? "Sem workspace"}</span>
              <div className={styles.metaRow}>
                <span>{session.alertCount} alertas</span>
                <span>{session.eventCount} eventos</span>
              </div>
              <time dateTime={session.startedAt}>{formatAbsoluteTimestamp(session.startedAt)}</time>
            </button>
          ))}
        </div>

        {sessionDetail ? (
          <article className={styles.detailPanel}>
            <header className={styles.detailHeader}>
              <div>
                <p className={styles.sectionLabel}>Detalhes</p>
                <h3 className={styles.detailTitle}>{sessionDetail.session.name}</h3>
              </div>
              {sessionDetail.session.status === "active" ? (
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={finishingSessionId === sessionDetail.session.id}
                  onClick={() => {
                    void onFinishSession(sessionDetail.session.id);
                  }}
                >
                  {finishingSessionId === sessionDetail.session.id ? "Encerrando..." : "Encerrar sessao"}
                </button>
              ) : null}
            </header>

            <dl className={styles.definitionList}>
              <div>
                <dt>Status</dt>
                <dd>{formatWorkspaceSessionStatus(sessionDetail.session.status)}</dd>
              </div>
              <div>
                <dt>Workspace</dt>
                <dd>{sessionDetail.session.workspaceName ?? "Sem workspace vinculado"}</dd>
              </div>
              <div>
                <dt>Inicio</dt>
                <dd>{formatAbsoluteTimestamp(sessionDetail.session.startedAt)}</dd>
              </div>
              <div>
                <dt>Fim</dt>
                <dd>{formatAbsoluteTimestamp(sessionDetail.session.finishedAt)}</dd>
              </div>
            </dl>

            <section className={styles.relatedPanel}>
              <div>
                <p className={styles.subsectionLabel}>Alertas da sessao</p>
                {sessionDetail.relatedAlerts.length === 0 ? (
                  <span className={styles.emptyInline}>Nenhum alerta correlacionado.</span>
                ) : (
                  <div className={styles.tagList}>
                    {sessionDetail.relatedAlerts.map((alert) => (
                      <span key={alert.id} className={styles.tag}>
                        {formatEventSeverity(alert.severity)}: {alert.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className={styles.subsectionLabel}>Eventos da sessao</p>
                <div className={styles.eventList}>
                  {sessionDetail.relatedEvents.slice(0, 8).map((event) => (
                    <div key={event.id} className={styles.eventItem}>
                      <strong>{event.type}</strong>
                      <span>{event.target}</span>
                      <time dateTime={event.timestamp}>{formatAbsoluteTimestamp(event.timestamp)}</time>
                    </div>
                  ))}
                  {sessionDetail.relatedEvents.length === 0 ? (
                    <span className={styles.emptyInline}>Nenhum evento vinculado.</span>
                  ) : null}
                </div>
              </div>
            </section>
          </article>
        ) : null}
      </div>
    </section>
  );
}
