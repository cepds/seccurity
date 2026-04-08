import os from "node:os";
import { app, dialog, ipcMain } from "electron";
import { getLogs, logEvent } from "./logger";
import { countEvents, getEvents } from "./eventService";
import { listProviders } from "./providerService";
import { countActiveSessions, listSessions } from "./sessionService";
import {
  getCachedTools,
  launchTool,
  scanInstalledTools,
  setManualToolExecutablePath,
} from "./toolService";
import {
  countWorkspaces,
  createWorkspace,
  getWorkspaceById,
  listWorkspaces,
} from "./workspaceService";
import { getMockUpdateStatus } from "./updateService";
import type {
  AppOverview,
  DesktopBootstrap,
  OpenWorkspaceResult,
  ToolId,
  ToolSaveInput,
  WorkspaceCreateInput,
} from "../../shared/types";

function buildOverview(): AppOverview {
  const tools = getCachedTools();
  const providers = listProviders();
  const updateStatus = getMockUpdateStatus(app.getVersion());
  const latestScan = tools
    .map((tool) => tool.lastCheckedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  return {
    appName: "SECCURITY",
    runtimeMode: "desktop",
    osLabel: `${os.release()} (${os.arch()})`,
    storageEngine: "SQLite",
    currentVersion: app.getVersion(),
    installedToolCount: tools.filter((tool) => tool.detected).length,
    totalToolCount: tools.length,
    providerCount: providers.length,
    activeSessionCount: countActiveSessions(),
    workspaceCount: countWorkspaces(),
    eventCount: countEvents(),
    lastScanAt: latestScan,
    updateStatus,
    providers,
  };
}

function buildBootstrap(): DesktopBootstrap {
  return {
    overview: buildOverview(),
    tools: getCachedTools(),
    logs: getLogs(120),
    sessions: listSessions(80),
    workspaces: listWorkspaces(),
    events: getEvents(120),
  };
}

async function launchWorkspace(workspaceId: string): Promise<OpenWorkspaceResult> {
  const workspace = getWorkspaceById(workspaceId);
  if (!workspace) {
    return {
      ok: false,
      workspaceId,
      launchedCount: 0,
      message: "Workspace nao encontrado.",
    };
  }

  const enabledAssignments = workspace.assignments
    .filter((assignment) => assignment.enabled)
    .sort((left, right) => left.launchOrder - right.launchOrder);

  let launchedCount = 0;
  for (const assignment of enabledAssignments) {
    const result = await launchTool(assignment.toolId, "workspace", workspace.id);
    if (result.ok) {
      launchedCount += 1;
    }
  }

  const message =
    launchedCount > 0
      ? `Workspace ${workspace.name} iniciou ${launchedCount} app(s).`
      : `Workspace ${workspace.name} nao possui apps habilitados ou detectados.`;

  logEvent("info", "workspace", "Execucao do workspace concluida.", {
    workspaceId: workspace.id,
    launchedCount,
  });

  return {
    ok: launchedCount > 0,
    workspaceId: workspace.id,
    launchedCount,
    message,
  };
}

export function registerIpcHandlers(): void {
  ipcMain.handle("tools:list", () => getCachedTools());

  ipcMain.handle("tools:save", (_event, input: ToolSaveInput) =>
    setManualToolExecutablePath(input.toolId, input.executablePath)
  );

  ipcMain.handle("tools:browse-executable", async () => {
    const result = await dialog.showOpenDialog({
      title: "Selecionar executavel",
      properties: ["openFile"],
      filters: [
        { name: "Executaveis", extensions: ["exe", "bat", "cmd"] },
        { name: "Todos os arquivos", extensions: ["*"] },
      ],
    });

    return {
      canceled: result.canceled,
      executablePath: result.canceled ? null : (result.filePaths[0] ?? null),
    };
  });

  ipcMain.handle("workspaces:list", () => listWorkspaces());

  ipcMain.handle("workspaces:create", (_event, input: WorkspaceCreateInput) => {
    const workspace = createWorkspace(input);
    logEvent("success", "workspace", "Workspace criado via IPC.", {
      workspaceId: workspace.id,
      name: workspace.name,
    });
    return workspace;
  });

  ipcMain.handle("seccurity:bootstrap", () => {
    const cachedTools = getCachedTools();
    if (!cachedTools.some((tool) => tool.lastCheckedAt)) {
      scanInstalledTools();
      logEvent("info", "bootstrap", "Bootstrap disparou a primeira varredura de aplicativos.");
    }

    return buildBootstrap();
  });

  ipcMain.handle("seccurity:scan-tools", () => scanInstalledTools());

  ipcMain.handle("seccurity:launch-tool", (_event, toolId: ToolId) => launchTool(toolId));

  ipcMain.handle("seccurity:set-tool-path", (_event, toolId: ToolId, executablePath: string | null) =>
    setManualToolExecutablePath(toolId, executablePath)
  );

  ipcMain.handle("seccurity:get-logs", (_event, limit?: number) => getLogs(limit ?? 120));

  ipcMain.handle("seccurity:get-events", (_event, limit?: number) => getEvents(limit ?? 120));

  ipcMain.handle("seccurity:launch-workspace", (_event, workspaceId: string) =>
    launchWorkspace(workspaceId)
  );

  ipcMain.handle("seccurity:check-updates", () => {
    const updateStatus = getMockUpdateStatus(app.getVersion());
    logEvent("info", "updates", "Verificacao mockada de update executada.", {
      currentVersion: updateStatus.currentVersion,
      latestVersion: updateStatus.latestVersion,
      state: updateStatus.state,
      lastCheckedAt: updateStatus.lastCheckedAt,
      note: updateStatus.note,
    });
    return updateStatus;
  });
}
