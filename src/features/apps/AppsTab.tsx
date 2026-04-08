import type { DetectedTool, ToolId } from "../../../shared/types";
import { ToolCard } from "./ToolCard";
import styles from "./AppsTab.module.css";

interface AppsTabProps {
  tools: DetectedTool[];
  onRefresh: () => void;
  onLaunch: (toolId: ToolId) => void;
  onDefinePath: (toolId: ToolId) => void;
  isRefreshing: boolean;
  launchingToolId: ToolId | null;
  savingToolId: ToolId | null;
}

export function AppsTab({
  tools,
  onRefresh,
  onLaunch,
  onDefinePath,
  isRefreshing,
  launchingToolId,
  savingToolId,
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

      <div className={styles.cards}>
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            onLaunch={onLaunch}
            onDefinePath={onDefinePath}
            isLaunching={launchingToolId === tool.id}
            isSavingPath={savingToolId === tool.id}
          />
        ))}
      </div>
    </section>
  );
}
