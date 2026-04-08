import { useMemo, useState } from "react";
import { SidebarNav } from "../components/SidebarNav/SidebarNav";
import { OverviewTab } from "../features/overview/OverviewTab";
import { AppsTab } from "../features/apps/AppsTab";
import { LogsTab } from "../features/logs/LogsTab";
import { useDesktopState } from "../hooks/useDesktopState";
import styles from "./App.module.css";
import type { NavigationTabId } from "../../shared/types";

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTabId>("overview");
  const {
    snapshot,
    isLoading,
    isRefreshingTools,
    isCheckingUpdates,
    launchingToolId,
    actionMessage,
    errorMessage,
    refreshTools,
    launchTool,
    checkForUpdates,
  } = useDesktopState();

  const sidebarItems = useMemo(
    () => [
      {
        id: "overview" as const,
        label: "Visao geral",
        summary: "Runtime, providers e estado da sessao.",
      },
      {
        id: "apps" as const,
        label: "Apps",
        summary: "Deteccao local, caminho, versao e launcher.",
      },
      {
        id: "logs" as const,
        label: "Logs",
        summary: "Historico persistido em SQLite.",
      },
    ],
    []
  );

  const activeView = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    switch (activeTab) {
      case "apps":
        return (
          <AppsTab
            tools={snapshot.tools}
            onRefresh={refreshTools}
            onLaunch={launchTool}
            isRefreshing={isRefreshingTools}
            launchingToolId={launchingToolId}
          />
        );
      case "logs":
        return <LogsTab logs={snapshot.logs} />;
      case "overview":
      default:
        return (
          <OverviewTab
            overview={snapshot.overview}
            onCheckUpdates={() => {
              void checkForUpdates();
            }}
            isCheckingUpdates={isCheckingUpdates}
          />
        );
    }
  }, [
    activeTab,
    checkForUpdates,
    isCheckingUpdates,
    isRefreshingTools,
    launchTool,
    launchingToolId,
    refreshTools,
    snapshot,
  ]);

  return (
    <div className={styles.shell}>
      <div className={styles.chrome} aria-hidden="true" />

      <div className={styles.layout}>
        <SidebarNav
          items={sidebarItems}
          activeId={activeTab}
          onSelect={setActiveTab}
          version={snapshot?.overview.currentVersion ?? "1.0.0"}
          runtimeLabel={snapshot?.overview.runtimeMode ?? "loading"}
        />

        <main className={styles.workspace}>
          <header className={styles.topbar}>
            <div>
              <p className={styles.topbarLabel}>Operational Surface</p>
              <h2 className={styles.topbarTitle}>
                {activeTab === "overview"
                  ? "Visao geral"
                  : activeTab === "apps"
                    ? "Aplicativos"
                    : "Logs"}
              </h2>
            </div>

            <div className={styles.statusRail}>
              {snapshot ? (
                <>
                  <span className={styles.statusPill}>
                    {snapshot.overview.installedToolCount} apps detectados
                  </span>
                  <span className={styles.statusPill}>{snapshot.overview.providerCount} providers</span>
                </>
              ) : null}
            </div>
          </header>

          {actionMessage ? <div className={styles.messageBar}>{actionMessage}</div> : null}
          {errorMessage ? <div className={styles.errorBar}>{errorMessage}</div> : null}

          <section className={styles.contentPanel}>
            {isLoading || !snapshot ? (
              <div className={styles.loadingState}>
                <span className={styles.loadingEyebrow}>Bootstrapping</span>
                <strong>Carregando shell local, inventario e logs...</strong>
              </div>
            ) : (
              activeView
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
