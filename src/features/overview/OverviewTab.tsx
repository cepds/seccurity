import { formatAbsoluteTimestamp, formatProviderKind, formatRelativeMinutes } from "../../lib/format";
import type { AppOverview } from "../../../shared/types";
import styles from "./OverviewTab.module.css";

interface OverviewTabProps {
  overview: AppOverview;
  onCheckUpdates: () => void;
  isCheckingUpdates: boolean;
}

export function OverviewTab({
  overview,
  onCheckUpdates,
  isCheckingUpdates,
}: OverviewTabProps) {
  const readinessRatio =
    overview.totalToolCount === 0
      ? "0%"
      : `${Math.round((overview.installedToolCount / overview.totalToolCount) * 100)}%`;

  return (
    <div className={styles.overview}>
      <section className={styles.summaryBand}>
        <div>
          <p className={styles.kicker}>Workspace</p>
          <h2 className={styles.headline}>
            Inventario local, launcher e observabilidade em uma superficie unica.
          </h2>
        </div>

        <div className={styles.metrics}>
          <div>
            <span className={styles.metricLabel}>Apps detectados</span>
            <strong className={styles.metricValue}>
              {overview.installedToolCount}/{overview.totalToolCount}
            </strong>
            <span className={styles.metricFootnote}>{readinessRatio} de prontidao</span>
          </div>
          <div>
            <span className={styles.metricLabel}>Ultima varredura</span>
            <strong className={styles.metricValue}>{formatRelativeMinutes(overview.lastScanAt)}</strong>
            <span className={styles.metricFootnote}>Inventario local em SQLite</span>
          </div>
          <div>
            <span className={styles.metricLabel}>Alertas</span>
            <strong className={styles.metricValue}>{overview.alertCount}</strong>
            <span className={styles.metricFootnote}>
              {overview.activeSessionCount} sessoes ativas agora
            </span>
          </div>
        </div>
      </section>

      <section className={styles.healthGrid}>
        <article className={styles.healthCard}>
          <span className={styles.sectionLabel}>Workspace health</span>
          <strong className={styles.healthValue}>{overview.workspaceCount}</strong>
          <span className={styles.healthHint}>Workspaces prontos para execucao</span>
        </article>

        <article className={styles.healthCard}>
          <span className={styles.sectionLabel}>Events</span>
          <strong className={styles.healthValue}>{overview.eventCount}</strong>
          <span className={styles.healthHint}>Eventos persistidos para correlacao e auditoria</span>
        </article>

        <article className={styles.healthCard}>
          <span className={styles.sectionLabel}>Providers</span>
          <strong className={styles.healthValue}>{overview.providerCount}</strong>
          <span className={styles.healthHint}>Camadas configuradas para IA aberta</span>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.sectionLabel}>Runtime</p>
              <h3 className={styles.sectionTitle}>Estado do aplicativo</h3>
            </div>
            <button
              type="button"
              className={styles.inlineAction}
              onClick={onCheckUpdates}
              disabled={isCheckingUpdates}
            >
              {isCheckingUpdates ? "Verificando..." : "Check update"}
            </button>
          </div>

          <dl className={styles.definitionList}>
            <div>
              <dt>Versao atual</dt>
              <dd>{overview.currentVersion}</dd>
            </div>
            <div>
              <dt>Storage</dt>
              <dd>{overview.storageEngine}</dd>
            </div>
            <div>
              <dt>Windows</dt>
              <dd>{overview.osLabel}</dd>
            </div>
            <div>
              <dt>Update status</dt>
              <dd>{overview.updateStatus.note}</dd>
            </div>
            <div>
              <dt>Sessoes ativas</dt>
              <dd>{overview.activeSessionCount}</dd>
            </div>
            <div>
              <dt>Console</dt>
              <dd>
                {overview.features.console.enabled
                  ? "Disponivel"
                  : overview.features.console.reason ?? "Indisponivel"}
              </dd>
            </div>
            <div>
              <dt>Ultima checagem</dt>
              <dd>{formatAbsoluteTimestamp(overview.updateStatus.lastCheckedAt)}</dd>
            </div>
          </dl>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.sectionLabel}>Providers</p>
              <h3 className={styles.sectionTitle}>Camada de IA preparada para extensao</h3>
            </div>
            <span className={styles.counter}>{overview.providerCount} ativos</span>
          </div>

          <div className={styles.providerList}>
            {overview.providers.map((provider) => (
              <section key={provider.id} className={styles.providerItem}>
                <header className={styles.providerHeader}>
                  <div>
                    <h4>{provider.name}</h4>
                    <p>{formatProviderKind(provider.kind)}</p>
                  </div>
                  <span className={styles.providerStatus}>{provider.status}</span>
                </header>
                <p className={styles.providerUrl}>{provider.baseUrl}</p>
                <p className={styles.providerNotes}>{provider.notes}</p>
              </section>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
