import { useMemo, useState } from "react";
import { SidebarNav } from "../components/SidebarNav/SidebarNav";
import { AlertsTab } from "../features/alerts/AlertsTab";
import { OverviewTab } from "../features/overview/OverviewTab";
import { AppsTab } from "../features/apps/AppsTab";
import { ConsoleTab } from "../features/console/ConsoleTab";
import { EventsTab } from "../features/events/EventsTab";
import { LogsTab } from "../features/logs/LogsTab";
import { SessionsTab } from "../features/sessions/SessionsTab";
import { WorkspacesTab } from "../features/workspaces/WorkspacesTab";
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
    savingToolId,
    isCreatingWorkspace,
    updatingWorkspaceId,
    updatingWorkspaceAssignmentKey,
    launchingWorkspaceId,
    finishingSessionId,
    actionMessage,
    errorMessage,
    terminalSession,
    terminalOutput,
    isStartingTerminal,
    refreshTools,
    launchTool,
    defineToolExecutablePath,
    checkForUpdates,
    createWorkspace,
    renameWorkspace,
    updateWorkspaceAssignment,
    launchWorkspace,
    finishWorkspaceSession,
    ensureTerminalSession,
    sendTerminalCommand,
    clearTerminalOutput,
  } = useDesktopState();

  const tabTitles: Record<NavigationTabId, string> = {
    overview: "Visao geral",
    apps: "Biblioteca de apps",
    workspaces: "Workspaces",
    sessions: "Sessions",
    alerts: "Alerts",
    events: "Eventos",
    console: "Console",
    logs: "Logs",
  };

  const tabSubtitles: Record<NavigationTabId, string> = {
    overview: "Saude do runtime, providers, estado operacional e disponibilidade de recursos.",
    apps: "Inventario local com override manual, origem do path e launcher persistido.",
    workspaces: "Colecoes de apps com ordem de abertura, slot de janela e execucao coordenada.",
    sessions: "Historico operacional das execucoes de workspace com contexto, eventos e fechamento.",
    alerts: "Alertas correlacionados a partir de eventos persistidos e sessoes recentes.",
    events: "Timeline padronizada para trilha de auditoria, observabilidade e futuras regras.",
    console: "Superficie integrada para PowerShell local com saida ao vivo e fluxo rapido.",
    logs: "Registro persistido para diagnostico do shell e dos servicos locais.",
  };

  const isConsoleAvailable = snapshot?.overview.features.console.enabled ?? false;
  const effectiveActiveTab: NavigationTabId =
    activeTab === "console" && !isConsoleAvailable ? "overview" : activeTab;

  const sidebarItems = useMemo(
    () =>
      [
        {
          id: "overview" as const,
          label: "Visao geral",
          summary: "Runtime, providers e estado da sessao.",
        },
        {
          id: "apps" as const,
          label: "Biblioteca",
          summary: "Colecao local de apps com busca, origem do path e launcher.",
        },
        {
          id: "workspaces" as const,
          label: "Workspaces",
          summary: "Colecoes, criacao e edicao de nomes.",
        },
        {
          id: "sessions" as const,
          label: "Sessions",
          summary: "Execucoes de workspace com contexto e correlacao.",
        },
        {
          id: "alerts" as const,
          label: "Alerts",
          summary: "Alertas persistidos com eventos relacionados.",
        },
        {
          id: "events" as const,
          label: "Eventos",
          summary: "Stream persistido com filtros por origem e severidade.",
        },
        isConsoleAvailable
          ? {
              id: "console" as const,
              label: "Console",
              summary: "Terminal PowerShell integrado com streaming ao vivo.",
            }
          : null,
        {
          id: "logs" as const,
          label: "Logs",
          summary: "Historico persistido em SQLite.",
        },
      ].filter((item): item is NonNullable<typeof item> => item !== null),
    [isConsoleAvailable]
  );

  const activeView = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    switch (effectiveActiveTab) {
      case "apps":
        return (
          <AppsTab
            tools={snapshot.tools}
            onRefresh={refreshTools}
            onLaunch={launchTool}
            onDefinePath={defineToolExecutablePath}
            isRefreshing={isRefreshingTools}
            launchingToolId={launchingToolId}
            savingToolId={savingToolId}
          />
        );
      case "logs":
        return <LogsTab logs={snapshot.logs} />;
      case "alerts":
        return <AlertsTab alerts={snapshot.alerts} events={snapshot.events} />;
      case "console":
        return (
          <ConsoleTab
            terminalSession={terminalSession}
            terminalOutput={terminalOutput}
            isStartingTerminal={isStartingTerminal}
            onInitializeTerminal={ensureTerminalSession}
            onSendCommand={sendTerminalCommand}
            onClearOutput={clearTerminalOutput}
          />
        );
      case "events":
        return <EventsTab events={snapshot.events} />;
      case "sessions":
        return (
          <SessionsTab
            sessions={snapshot.workspaceSessions}
            alerts={snapshot.alerts}
            events={snapshot.events}
            finishingSessionId={finishingSessionId}
            onFinishSession={async (sessionId) => {
              await finishWorkspaceSession(sessionId);
            }}
          />
        );
      case "workspaces":
        return (
          <WorkspacesTab
            workspaces={snapshot.workspaces}
            onCreateWorkspace={async (name) => {
              await createWorkspace(name);
            }}
            onRenameWorkspace={async (workspaceId, name) => {
              await renameWorkspace(workspaceId, name);
            }}
            onUpdateWorkspaceAssignment={async (workspaceId, assignment) => {
              await updateWorkspaceAssignment(workspaceId, assignment);
            }}
            onLaunchWorkspace={async (workspaceId) => {
              await launchWorkspace(workspaceId);
            }}
            isCreatingWorkspace={isCreatingWorkspace}
            updatingWorkspaceId={updatingWorkspaceId}
            updatingWorkspaceAssignmentKey={updatingWorkspaceAssignmentKey}
            launchingWorkspaceId={launchingWorkspaceId}
          />
        );
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
    checkForUpdates,
    createWorkspace,
    defineToolExecutablePath,
    effectiveActiveTab,
    isCheckingUpdates,
    isCreatingWorkspace,
    isRefreshingTools,
    isStartingTerminal,
    launchingWorkspaceId,
    launchTool,
    launchingToolId,
    launchWorkspace,
    refreshTools,
    renameWorkspace,
    updateWorkspaceAssignment,
    ensureTerminalSession,
    finishWorkspaceSession,
    finishingSessionId,
    savingToolId,
    snapshot,
    terminalOutput,
    terminalSession,
    updatingWorkspaceId,
    updatingWorkspaceAssignmentKey,
    sendTerminalCommand,
    clearTerminalOutput,
  ]);

  return (
    <div className={styles.shell}>
      <div className={styles.chrome} aria-hidden="true" />

      <div className={styles.layout}>
        <SidebarNav
          items={sidebarItems}
          activeId={effectiveActiveTab}
          onSelect={setActiveTab}
          version={snapshot?.overview.currentVersion ?? "1.0.0"}
          runtimeLabel={snapshot?.overview.runtimeMode ?? "loading"}
        />

        <main className={styles.workspace}>
          <header className={styles.topbar}>
            <div className={styles.topbarCopy}>
              <p className={styles.topbarLabel}>Operational Surface</p>
              <h2 className={styles.topbarTitle}>{tabTitles[effectiveActiveTab]}</h2>
              <p className={styles.topbarSubtitle}>{tabSubtitles[effectiveActiveTab]}</p>
            </div>

            <div className={styles.statusRail}>
              {snapshot ? (
                <>
                  <span className={`${styles.statusPill} ${styles.statusPillAccent}`}>
                    {snapshot.overview.runtimeMode}
                  </span>
                  <span className={styles.statusPill}>
                    {snapshot.overview.installedToolCount} apps detectados
                  </span>
                  <span className={styles.statusPill}>
                    {snapshot.overview.workspaceCount} workspaces
                  </span>
                  <span className={styles.statusPill}>
                    {snapshot.overview.activeSessionCount} sessoes ativas
                  </span>
                  <span className={styles.statusPill}>{snapshot.overview.alertCount} alertas</span>
                  <span className={styles.statusPill}>{snapshot.overview.eventCount} eventos</span>
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
