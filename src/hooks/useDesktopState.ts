import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { desktopClient } from "../services/desktopClient";
import { databaseClient } from "../services/databaseClient";
import type {
  DesktopBootstrap,
  LaunchToolResult,
  ToolId,
  UpdateStatus,
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
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    actionMessage,
    errorMessage,
    installedCount,
    refreshTools,
    launchTool,
    defineToolExecutablePath,
    checkForUpdates,
    createWorkspace,
    renameWorkspace,
  };
}
