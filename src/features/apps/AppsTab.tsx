import { formatAbsoluteTimestamp, formatToolCategory } from "../../lib/format";
import type { DetectedTool, ToolId } from "../../../shared/types";
import styles from "./AppsTab.module.css";

interface AppsTabProps {
  tools: DetectedTool[];
  onRefresh: () => void;
  onLaunch: (toolId: ToolId) => void;
  isRefreshing: boolean;
  launchingToolId: ToolId | null;
}

export function AppsTab({
  tools,
  onRefresh,
  onLaunch,
  isRefreshing,
  launchingToolId,
}: AppsTabProps) {
  return (
    <section className={styles.appsTab}>
      <header className={styles.header}>
        <div>
          <p className={styles.sectionLabel}>Apps</p>
          <h2 className={styles.sectionTitle}>Ferramentas locais detectadas no Windows 10</h2>
        </div>
        <button type="button" className={styles.refreshButton} onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? "Atualizando..." : "Reescanear"}
        </button>
      </header>

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span>Ferramenta</span>
          <span>Categoria</span>
          <span>Versao</span>
          <span>Caminho</span>
          <span>Status</span>
          <span>Acoes</span>
        </div>

        <div className={styles.rows}>
          {tools.map((tool) => (
            <article key={tool.id} className={styles.row}>
              <div>
                <strong>{tool.name}</strong>
                <p>{tool.description}</p>
              </div>
              <span>{formatToolCategory(tool.category)}</span>
              <span>{tool.version ?? "Nao identificado"}</span>
              <code className={styles.path}>{tool.installPath ?? "Nao encontrado"}</code>
              <span className={`${styles.status} ${tool.detected ? styles.statusReady : styles.statusMissing}`}>
                {tool.detected ? "Detectado" : "Ausente"}
              </span>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.launchButton}
                  disabled={!tool.launchable || launchingToolId === tool.id}
                  onClick={() => onLaunch(tool.id)}
                >
                  {launchingToolId === tool.id ? "Abrindo..." : "Abrir"}
                </button>
                <span className={styles.timestamp}>{formatAbsoluteTimestamp(tool.lastCheckedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
