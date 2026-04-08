import { useMemo, useState } from "react";
import { formatAbsoluteTimestamp, formatEventSeverity } from "../../lib/format";
import type { EventSeverity, StandardizedEvent } from "../../../shared/types";
import styles from "./EventsTab.module.css";

type SortDirection = "desc" | "asc";

interface EventsTabProps {
  events: StandardizedEvent[];
}

const severityOptions: EventSeverity[] = ["info", "low", "medium", "high", "critical"];

export function EventsTab({ events }: EventsTabProps) {
  const [sourceFilter, setSourceFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const availableSources = useMemo(() => {
    return Array.from(new Set(events.map((event) => event.source))).sort((left, right) =>
      left.localeCompare(right)
    );
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => (sourceFilter ? event.source === sourceFilter : true))
      .filter((event) => (severityFilter ? event.severity === severityFilter : true))
      .sort((left, right) => {
        const leftTimestamp = new Date(left.timestamp).getTime();
        const rightTimestamp = new Date(right.timestamp).getTime();

        return sortDirection === "desc"
          ? rightTimestamp - leftTimestamp
          : leftTimestamp - rightTimestamp;
      });
  }, [events, severityFilter, sortDirection, sourceFilter]);

  return (
    <section className={styles.eventsTab}>
      <header className={styles.header}>
        <div>
          <p className={styles.sectionLabel}>Eventos</p>
          <h2 className={styles.sectionTitle}>Timeline padronizada com leitura rapida</h2>
        </div>
        <span className={styles.count}>{filteredEvents.length} eventos visiveis</span>
      </header>

      <section className={styles.filtersPanel}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Source</span>
          <select
            className={styles.select}
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
          >
            <option value="">Todos</option>
            {availableSources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Severity</span>
          <select
            className={styles.select}
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
          >
            <option value="">Todas</option>
            {severityOptions.map((severity) => (
              <option key={severity} value={severity}>
                {formatEventSeverity(severity)}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Ordem</span>
          <select
            className={styles.select}
            value={sortDirection}
            onChange={(event) => setSortDirection(event.target.value as SortDirection)}
          >
            <option value="desc">Mais recentes</option>
            <option value="asc">Mais antigos</option>
          </select>
        </label>
      </section>

      {filteredEvents.length === 0 ? (
        <div className={styles.emptyState}>Nenhum evento encontrado com os filtros atuais.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Source</th>
                <th>Type</th>
                <th>Target</th>
                <th>Severity</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td>
                    <time dateTime={event.timestamp}>
                      {formatAbsoluteTimestamp(event.timestamp)}
                    </time>
                  </td>
                  <td>{event.source}</td>
                  <td>{event.type}</td>
                  <td>{event.target}</td>
                  <td>
                    <span
                      className={`${styles.severityBadge} ${
                        styles[`severity${event.severity[0].toUpperCase()}${event.severity.slice(1)}`]
                      }`}
                    >
                      {formatEventSeverity(event.severity)}
                    </span>
                  </td>
                  <td>
                    <pre className={styles.payload}>{JSON.stringify(event.data, null, 2)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
