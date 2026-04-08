import { formatAbsoluteTimestamp } from "../../lib/format";
import type { AppLogEntry } from "../../../shared/types";
import styles from "./LogsTab.module.css";

interface LogsTabProps {
  logs: AppLogEntry[];
}

export function LogsTab({ logs }: LogsTabProps) {
  return (
    <section className={styles.logsTab}>
      <header className={styles.header}>
        <div>
          <p className={styles.sectionLabel}>Logs</p>
          <h2 className={styles.sectionTitle}>Eventos persistidos em SQLite</h2>
        </div>
        <span className={styles.count}>{logs.length} registros</span>
      </header>

      <div className={styles.logList}>
        {logs.map((entry) => (
          <article key={entry.id} className={styles.logItem}>
            <div className={styles.logMeta}>
              <span
                className={`${styles.level} ${
                  styles[`level${entry.level[0].toUpperCase()}${entry.level.slice(1)}`]
                }`}
              >
                {entry.level}
              </span>
              <strong>{entry.scope}</strong>
              <time dateTime={entry.createdAt}>{formatAbsoluteTimestamp(entry.createdAt)}</time>
            </div>
            <p className={styles.message}>{entry.message}</p>
            {entry.metadata ? (
              <pre className={styles.metadata}>{JSON.stringify(entry.metadata, null, 2)}</pre>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
