import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { desktopClient } from "../services/desktopClient";
import { databaseClient } from "../services/databaseClient";
import type {
  DesktopBootstrap,
  FinishWorkspaceSessionResult,
  LaunchToolResult,
  TerminalOutputChunk,
  TerminalSessionInfo,
  ToolId,
  UpdateStatus,
  WorkspaceAppAssignment,
  WorkspaceDefinition,
} from "../../shared/types";

export function useDesktopState() {
  const [snapshot, setSnapshot] = useState<DesktopBootstrap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingTools, setIsRefreshingTools] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [launchingToolId, setLaunchingToolId] = useState<ToolId | null>(null);
  const [savingToolId, setSavingToolId] = useState<ToolId | null>(null);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [updatingWorkspaceId, setUpdatingWorkspaceId] = useState<string | null>(null);
  const [updatingWorkspaceAssignmentKey, setUpdatingWorkspaceAssignmentKey] = useState<string | null>(null);
  const [launchingWorkspaceId, setLaunchingWorkspaceId] = useState<string | null>(null);
  const [finishingSessionId, setFinishingSessionId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [terminalSession, setTerminalSession] = useState<TerminalSessionInfo | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<TerminalOutputChunk[]>([]);
  const [isStartingTerminal, setIsStartingTerminal] = useState(false);
  const terminalSessionRef = useRef<TerminalSessionInfo | null>(null);

  useEffect(() => {
    terminalSessionRef.current = terminalSession;
  }, [terminalSession]);

  const loadBootstrap = useCallback(
    async (withSpinner = true) => {
      if (withSpinner) {
        setIsLoading(true);
      }

      try {
        const nextSnapshot = await desktopClient.bootstrap();
        startTransition(() => {
          setSnapshot(nextSnapshot);
          setErrorMessage(null);
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao carregar o bootstrap.";
        setErrorMessage(message);
      } finally {
        if (withSpinner) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void loadBootstrap(true);
  }, [loadBootstrap]);

  const ensureTerminalSession = useCallback(async (): Promise<TerminalSessionInfo | null> => {
    const existingSession = terminalSessionRef.current;
    if (existingSession?.isActive) {
      return existingSession;
    }

    setIsStartingTerminal(true);

    try {
      const session = await desktopClient.createTerminalSession();
      startTransition(() => {
        setTerminalSession(session);
        setErrorMessage(null);
      });
      return session;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao iniciar o console PowerShell.";
      setErrorMessage(message);
      return null;
    } finally {
      setIsStartingTerminal(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribeOutput = desktopClient.onTerminalOutput((chunk) => {
      startTransition(() => {
        setTerminalOutput((current) => {
          const nextOutput = [...current, chunk];
          return nextOutput.length > 500 ? nextOutput.slice(-500) : nextOutput;
        });
      });
    });

    const unsubscribeExit = desktopClient.onTerminalExit((event) => {
      startTransition(() => {
        setTerminalSession((current) =>
          current?.id === event.sessionId
            ? {
                ...current,
                isActive: false,
              }
            : current
        );
      });
      setActionMessage(`Console encerrado com codigo ${event.exitCode}.`);
    });

    return () => {
      unsubscribeOutput();
      unsubscribeExit();
    };
  }, [ensureTerminalSession]);

  async function refreshTools() {
    setIsRefreshingTools(true);

    try {
      await desktopClient.scanTools();
      await loadBootstrap(false);
      setActionMessage("Inventario local atualizado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao atualizar aplicativos.";
      setErrorMessage(message);
    } finally {
      setIsRefreshingTools(false);
    }
  }

  async function launchTool(toolId: ToolId): Promise<LaunchToolResult | null> {
    setLaunchingToolId(toolId);

    try {
      const result = await desktopClient.launchTool(toolId);
      setActionMessage(result.message);
      await loadBootstrap(false);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao iniciar o executavel.";
      setErrorMessage(message);
      return null;
    } finally {
      setLaunchingToolId(null);
    }
  }

  async function defineToolExecutablePath(toolId: ToolId): Promise<void> {
    setSavingToolId(toolId);

    try {
      const browseResult = await databaseClient.browseToolExecutablePath(toolId);
      if (browseResult.canceled || !browseResult.executablePath) {
        return;
      }

      const result = await databaseClient.saveTool({
        toolId,
        executablePath: browseResult.executablePath,
      });

      setActionMessage(result.message);
      await loadBootstrap(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar caminho manual.";
      setErrorMessage(message);
    } finally {
      setSavingToolId(null);
    }
  }

  async function checkForUpdates(): Promise<UpdateStatus | null> {
    setIsCheckingUpdates(true);

    try {
      const updateStatus = await desktopClient.checkForUpdates();
      startTransition(() => {
        setSnapshot((current) =>
          current
            ? {
                ...current,
                overview: {
                  ...current.overview,
                  updateStatus,
                },
              }
            : current
        );
      });
      setActionMessage(updateStatus.note);
      await loadBootstrap(false);
      return updateStatus;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao verificar updates.";
      setErrorMessage(message);
      return null;
    } finally {
      setIsCheckingUpdates(false);
    }
  }

  async function createWorkspace(name: string): Promise<WorkspaceDefinition | null> {
    setIsCreatingWorkspace(true);

    try {
      const workspace = await databaseClient.createWorkspace({ name });
      setActionMessage(`Workspace ${workspace.name} criado.`);
      await loadBootstrap(false);
      return workspace;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao criar workspace.";
      setErrorMessage(message);
      return null;
    } finally {
      setIsCreatingWorkspace(false);
    }
  }

  async function renameWorkspace(workspaceId: string, name: string): Promise<WorkspaceDefinition | null> {
    setUpdatingWorkspaceId(workspaceId);

    try {
      const workspace = await databaseClient.updateWorkspace({ workspaceId, name });
      setActionMessage(`Workspace ${workspace.name} atualizado.`);
      await loadBootstrap(false);
      return workspace;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao atualizar workspace.";
      setErrorMessage(message);
      return null;
    } finally {
      setUpdatingWorkspaceId(null);
    }
  }

  async function updateWorkspaceAssignment(
    workspaceId: string,
    assignment: WorkspaceAppAssignment
  ): Promise<WorkspaceDefinition | null> {
    const assignmentKey = `${workspaceId}:${assignment.toolId}`;
    setUpdatingWorkspaceAssignmentKey(assignmentKey);

    try {
      const workspace = await databaseClient.updateWorkspaceAssignment({
        workspaceId,
        toolId: assignment.toolId,
        enabled: assignment.enabled,
        launchOrder: assignment.launchOrder,
        windowSlot: assignment.windowSlot,
      });
      setActionMessage(`Associacao de ${assignment.toolId} atualizada em ${workspace.name}.`);
      await loadBootstrap(false);
      return workspace;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao atualizar associacao do workspace.";
      setErrorMessage(message);
      return null;
    } finally {
      setUpdatingWorkspaceAssignmentKey(null);
    }
  }

  async function launchWorkspace(workspaceId: string): Promise<void> {
    setLaunchingWorkspaceId(workspaceId);

    try {
      const result = await desktopClient.launchWorkspace(workspaceId);
      const alertSuffix =
        typeof result.alertCount === "number" ? ` Correlacao gerou ${result.alertCount} alerta(s).` : "";
      setActionMessage(`${result.message}${alertSuffix}`);
      await loadBootstrap(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao executar workspace.";
      setErrorMessage(message);
    } finally {
      setLaunchingWorkspaceId(null);
    }
  }

  async function finishWorkspaceSession(sessionId: string): Promise<FinishWorkspaceSessionResult | null> {
    setFinishingSessionId(sessionId);

    try {
      const result = await databaseClient.finishWorkspaceSession(sessionId);
      setActionMessage(`${result.message} Correlacao gerou ${result.alertCount} alerta(s).`);
      await loadBootstrap(false);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao encerrar sessao.";
      setErrorMessage(message);
      return null;
    } finally {
      setFinishingSessionId(null);
    }
  }

  async function sendTerminalCommand(command: string): Promise<void> {
    const normalizedCommand = command.trim();
    if (!normalizedCommand) {
      return;
    }

    const session = await ensureTerminalSession();
    if (!session) {
      return;
    }

    try {
      await desktopClient.writeToTerminal(session.id, `${normalizedCommand}\r`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao enviar comando para o console.";
      setErrorMessage(message);
    }
  }

  function clearTerminalOutput(): void {
    setTerminalOutput([]);
  }

  const installedCount = useMemo(
    () => snapshot?.tools.filter((tool) => tool.detected).length ?? 0,
    [snapshot]
  );

  return {
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
    installedCount,
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
  };
}
