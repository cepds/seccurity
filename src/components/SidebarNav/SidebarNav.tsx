import type { NavigationTabId } from "../../../shared/types";
import styles from "./SidebarNav.module.css";

export interface SidebarItem {
  id: NavigationTabId;
  label: string;
  summary: string;
}

interface SidebarNavProps {
  items: SidebarItem[];
  activeId: NavigationTabId;
  onSelect: (tabId: NavigationTabId) => void;
  version: string;
  runtimeLabel: string;
}

export function SidebarNav({
  items,
  activeId,
  onSelect,
  version,
  runtimeLabel,
}: SidebarNavProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandBlock}>
        <p className={styles.eyebrow}>Desktop Security Workspace</p>
        <h1 className={styles.title}>SECCURITY</h1>
        <p className={styles.subtitle}>
          Hub local para inventario, abertura de apps, logs e futura integracao com IA.
        </p>
        <div className={styles.brandMeta}>
          <span className={styles.brandPill}>Windows 10 local-first</span>
          <span className={styles.brandPill}>SQLite no main</span>
        </div>
      </div>

      <nav className={styles.nav} aria-label="Navegacao principal">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.navButton} ${activeId === item.id ? styles.navButtonActive : ""}`}
            onClick={() => onSelect(item.id)}
          >
            <span className={styles.navLabel}>{item.label}</span>
            <span className={styles.navSummary}>{item.summary}</span>
          </button>
        ))}
      </nav>

      <div className={styles.meta}>
        <div>
          <span className={styles.metaLabel}>Versao</span>
          <strong>{version}</strong>
        </div>
        <div>
          <span className={styles.metaLabel}>Runtime</span>
          <strong>{runtimeLabel}</strong>
        </div>
      </div>
    </aside>
  );
}
