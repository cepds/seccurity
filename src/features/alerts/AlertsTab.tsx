import { useMemo, useState } from "react";
import { formatAbsoluteTimestamp, formatEventSeverity } from "../../lib/format";
import { buildAlertSeverityOptions, filterAlertsBySeverity, getAlertDetail } from "./alertSelectors";
import type { AlertRecord, EventSeverity, StandardizedEvent } from "../../../shared/types";
import styles from "./AlertsTab.module.css";

interface AlertsTabProps {
  alerts: AlertRecord[];
  events: StandardizedEvent[];
}

export function AlertsTab({ alerts, events }: AlertsTabProps) {
  const [severityFilter, setSeverityFilter] = useState<EventSeverity | "">("");
  const filteredAlerts = useMemo(
    () => filterAlertsBySeverity(alerts, severityFilter),
    [alerts, severityFilter]
  );
  const severityOptions = useMemo(() => buildAlertSeverityOptions(alerts), [alerts]);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const effectiveSelectedAlertId =
    selectedAlertId && filteredAlerts.some((alert) => alert.id === selectedAlertId)
      ? selectedAlertId
      : (filteredAlerts[0]?.id ?? null);

  const alertDetail = useMemo(() => {
    if (!effectiveSelectedAlertId) {
      return null;
    }

    return getAlertDetail(effectiveSelectedAlertId, alerts, events);
  }, [alerts, effectiveSelectedAlertId, events]);

  if (alerts.length === 0) {
    return <div className={styles.emptyState}>Nenhum alerta persistido ainda.</div>;
  }

  return (
    <section className={styles.alertsTab}>
      <header className={styles.header}>
        <div>
          <p className={styles.sectionLabel}>Alerts</p>
          <h2 className={styles.sectionTitle}>Correlacao inicial com severidade e eventos relacionados</h2>
        </div>

        <label className={styles.filterField}>
          <span>Severidade</span>
          <select
            className={styles.select}
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value as EventSeverity | "")}
          >
            <option value="">Todas</option>
            {severityOptions.map((severity) => (
              <option key={severity} value={severity}>
                {formatEventSeverity(severity)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className={styles.layout}>
        <div className={styles.alertList}>
          {filteredAlerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              className={`${styles.alertItem} ${
                effectiveSelectedAlertId === alert.id ? styles.alertItemActive : ""
              }`}
              onClick={() => setSelectedAlertId(alert.id)}
            >
              <div className={styles.alertTopline}>
                <strong>{alert.title}</strong>
                <span className={styles.severityBadge}>{formatEventSeverity(alert.severity)}</span>
              </div>
              <span className={styles.sourceLabel}>{alert.source}</span>
              <time dateTime={alert.timestamp}>{formatAbsoluteTimestamp(alert.timestamp)}</time>
            </button>
          ))}
        </div>

        {alertDetail ? (
          <article className={styles.detailPanel}>
            <header className={styles.detailHeader}>
              <div>
                <p className={styles.sectionLabel}>Detalhes</p>
                <h3 className={styles.detailTitle}>{alertDetail.alert.title}</h3>
              </div>
              <span className={styles.severityBadge}>
                {formatEventSeverity(alertDetail.alert.severity)}
              </span>
            </header>

            <dl className={styles.definitionList}>
              <div>
                <dt>Source</dt>
                <dd>{alertDetail.alert.source}</dd>
              </div>
              <div>
                <dt>Timestamp</dt>
                <dd>{formatAbsoluteTimestamp(alertDetail.alert.timestamp)}</dd>
              </div>
              <div>
                <dt>Eventos relacionados</dt>
                <dd>{alertDetail.relatedEvents.length}</dd>
              </div>
            </dl>

            <section className={styles.relatedPanel}>
              <div>
                <p className={styles.subsectionLabel}>Payload</p>
                <pre className={styles.payload}>{JSON.stringify(alertDetail.alert.data, null, 2)}</pre>
              </div>

              <div>
                <p className={styles.subsectionLabel}>Eventos relacionados</p>
                <div className={styles.eventList}>
                  {alertDetail.relatedEvents.map((event) => (
                    <div key={event.id} className={styles.eventItem}>
                      <strong>{event.type}</strong>
                      <span>{event.target}</span>
                      <time dateTime={event.timestamp}>{formatAbsoluteTimestamp(event.timestamp)}</time>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </article>
        ) : null}
      </div>
    </section>
  );
}
