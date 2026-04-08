import { useMemo, useState } from "react";
import { formatToolCategory } from "../../lib/format";
import type { DetectedTool, ToolId } from "../../../shared/types";
import { ToolCard } from "./ToolCard";
import {
  buildToolInventorySummary,
  countToolsBySource,
  filterToolsByQuery,
  groupToolsByCategory,
} from "./appSelectors";
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
  const [query, setQuery] = useState("");
  const [installedOnly, setInstalledOnly] = useState(false);
  const searchedTools = useMemo(() => filterToolsByQuery(tools, query), [query, tools]);
  const visibleTools = useMemo(
    () => searchedTools.filter((tool) => (installedOnly ? tool.detected : true)),
    [installedOnly, searchedTools]
  );
  const libraryShelves = useMemo(() => groupToolsByCategory(visibleTools), [visibleTools]);
  const summary = useMemo(() => buildToolInventorySummary(tools), [tools]);

  return (
    <section className={styles.appsTab}>
      <header className={styles.header}>
        <div>
          <p className={styles.sectionLabel}>Biblioteca</p>
          <h2 className={styles.sectionTitle}>Apps locais organizados como biblioteca operacional</h2>
          <p className={styles.sectionDescription}>
            Inventario local com override manual, origem do path e launcher pronto para workspace.
          </p>
        </div>
        <button type="button" className={styles.refreshButton} onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? "Atualizando..." : "Reescanear"}
        </button>
      </header>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Detectados</span>
          <strong className={styles.summaryValue}>{summary.detectedCount}</strong>
          <span className={styles.summaryHint}>{summary.launchableCount} prontos para abrir</span>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Manual</span>
          <strong className={styles.summaryValue}>{summary.manualCount}</strong>
          <span className={styles.summaryHint}>Paths fixados manualmente</span>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Por origem</span>
          <strong className={styles.summaryValue}>
            {countToolsBySource(tools, "registry")} registry
          </strong>
          <span className={styles.summaryHint}>
            {countToolsBySource(tools, "where")} via path, {countToolsBySource(tools, "common")} comum
          </span>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Pendentes</span>
          <strong className={styles.summaryValue}>{summary.missingCount}</strong>
          <span className={styles.summaryHint}>Aguardando instalacao ou caminho manual</span>
        </article>
      </section>

      <section className={styles.filterPanel}>
        <label className={styles.searchField}>
          <span className={styles.searchLabel}>Filtrar inventario</span>
          <input
            className={styles.searchInput}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, categoria, executavel ou origem"
          />
        </label>
        <label className={styles.toggleField}>
          <input
            type="checkbox"
            checked={installedOnly}
            onChange={(event) => setInstalledOnly(event.target.checked)}
          />
          <span>Mostrar apenas detectados</span>
        </label>
        <span className={styles.resultCount}>{visibleTools.length} apps visiveis</span>
      </section>

      <section className={styles.librarySurface}>
        {libraryShelves.map((shelf) => (
          <section key={shelf.category} className={styles.libraryShelf}>
            <div className={styles.shelfHeader}>
              <div>
                <p className={styles.shelfLabel}>Categoria</p>
                <h3 className={styles.shelfTitle}>{formatToolCategory(shelf.category)}</h3>
              </div>
              <span className={styles.shelfCount}>{shelf.tools.length} itens</span>
            </div>

            <div className={styles.cards}>
              {shelf.tools.map((tool) => (
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
        ))}

        {libraryShelves.length === 0 ? (
          <div className={styles.emptyState}>
            Nenhum app encontrado com os filtros atuais.
          </div>
        ) : null}
      </section>
    </section>
  );
}
