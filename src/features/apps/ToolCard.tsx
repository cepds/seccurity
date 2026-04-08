import {
  formatAbsoluteTimestamp,
  formatToolCategory,
  formatToolPathSource,
} from "../../lib/format";
import type { DetectedTool, ToolId } from "../../../shared/types";
import styles from "./ToolCard.module.css";

interface ToolCardProps {
  tool: DetectedTool;
  onLaunch: (toolId: ToolId) => void;
  onDefinePath: (toolId: ToolId) => void;
  isLaunching: boolean;
  isSavingPath: boolean;
}

export function ToolCard({
  tool,
  onLaunch,
  onDefinePath,
  isLaunching,
  isSavingPath,
}: ToolCardProps) {
  const hasManualOverride = Boolean(tool.manualPath);

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>{tool.name}</h3>
          <p className={styles.description}>{tool.description}</p>
        </div>

        <div className={styles.badges}>
          <span
            className={`${styles.badge} ${tool.detected ? styles.badgeReady : styles.badgeMissing}`}
          >
            {tool.detected ? "Detectado" : "Ausente"}
          </span>
          <span className={`${styles.badge} ${styles.badgeSource}`}>
            {formatToolPathSource(tool.pathSource)}
          </span>
        </div>
      </header>

      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Categoria</span>
          <span className={styles.metaValue}>{formatToolCategory(tool.category)}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Versao</span>
          <span className={styles.metaValue}>{tool.version ?? "Nao identificado"}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Executavel</span>
          <span className={styles.metaValue}>{tool.executableName}</span>
        </div>
      </div>

      <div className={styles.pathBox}>
        <span className={styles.metaLabel}>Caminho atual</span>
        <p className={styles.pathValue}>{tool.installPath ?? "Nenhum executavel configurado."}</p>
        {hasManualOverride ? (
          <div className={styles.pathMeta}>
            <span className={styles.pathHint}>Manual</span>
            <code className={styles.pathCode}>{tool.manualPath}</code>
          </div>
        ) : null}
        {tool.autoDetectedPath && tool.autoDetectedPath !== tool.installPath ? (
          <div className={styles.pathMeta}>
            <span className={styles.pathHint}>Auto detectado</span>
            <code className={styles.pathCode}>{tool.autoDetectedPath}</code>
          </div>
        ) : null}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => onDefinePath(tool.id)}
          disabled={isSavingPath}
        >
          {isSavingPath ? "Salvando..." : "Definir caminho"}
        </button>

        <button
          type="button"
          className={styles.actionButton}
          onClick={() => onLaunch(tool.id)}
          disabled={!tool.launchable || isLaunching}
        >
          {isLaunching ? "Abrindo..." : "Abrir"}
        </button>

        <span className={styles.timestamp}>
          Ultima verificacao: {formatAbsoluteTimestamp(tool.lastCheckedAt)}
        </span>
      </div>
    </article>
  );
}
