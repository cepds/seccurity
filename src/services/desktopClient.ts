import { toolCatalog } from "../../shared/toolCatalog";
import type {
  AlertRecord,
  DesktopApi,
  DesktopBootstrap,
  DetectedTool,
  FinishWorkspaceSessionResult,
  TerminalExitEvent,
  TerminalOutputChunk,
  TerminalSessionInfo,
  ToolBrowseResult,
  ToolSaveInput,
  UpdateStatus,
  WorkspaceSession,
  WorkspaceAssignmentUpdateInput,
  WorkspaceCreateInput,
  WorkspaceDefinition,
  WorkspaceUpdateInput,
} from "../../shared/types";

let previewWorkspaceCounter = 1;
let previewTerminalCounter = 1;
let previewTerminalSession: TerminalSessionInfo | null = null;
let previewWorkspaceSessionCounter = 1;

const previewTerminalOutputListeners = new Set<(chunk: TerminalOutputChunk) => void>();
const previewTerminalExitListeners = new Set<(event: TerminalExitEvent) => void>();

function emitPreviewTerminalOutput(chunk: TerminalOutputChunk) {
  previewTerminalOutputListeners.forEach((listener) => listener(chunk));
}

function emitPreviewTerminalExit(event: TerminalExitEvent) {
  previewTerminalExitListeners.forEach((listener) => listener(event));
}

function ensurePreviewTerminalSession(cwd?: string): TerminalSessionInfo {
  if (previewTerminalSession?.isActive) {
    return previewTerminalSession;
  }

  previewTerminalSession = {
    id: `preview-terminal-${previewTerminalCounter++}`,
    shell: "PowerShell Preview",
    cwd: cwd ?? "C:\\preview",
    startedAt: new Date().toISOString(),
    isActive: true,
  };

  queueMicrotask(() => {
    emitPreviewTerminalOutput({
      sessionId: previewTerminalSession!.id,
      text:
        "Windows PowerShell preview\r\nRenderer em modo navegador. Abra via Electron para terminal real.\r\nPS> ",
      stream: "system",
      timestamp: new Date().toISOString(),
    });
  });

  return previewTerminalSession;
}

function buildPreviewTools(): DetectedTool[] {
  return toolCatalog.map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    category: tool.category,
    detected: false,
    executableName: tool.executableNames[0],
    autoDetectedPath: null,
    manualPath: null,
    installPath: null,
    pathSource: "missing",
    version: null,
    launchable: false,
    lastCheckedAt: null,
    lastLaunchedAt: null,
  }));
}

function buildPreviewWorkspaces(): WorkspaceDefinition[] {
  return [
    {
      id: "primary-workspace",
      name: "Primary Workspace",
      description: "Workspace mockado para preview do renderer.",
      layoutMode: "manual",
      assignments: toolCatalog.map((tool, index) => ({
        workspaceId: "primary-workspace",
        toolId: tool.id,
        enabled: false,
        launchOrder: index,
        windowSlot: "manual",
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

function buildPreviewWorkspaceSessions(): WorkspaceSession[] {
  return [
    {
      id: "preview-session-1",
      name: "Primary Workspace @ preview",
      workspaceId: "primary-workspace",
      workspaceName: "Primary Workspace",
      status: "active",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      createdAt: new Date().toISOString(),
    },
  ];
}

function buildPreviewAlerts(): AlertRecord[] {
  return [
    {
      id: 1,
      timestamp: new Date().toISOString(),
      title: "Preview sem correlacao real",
      severity: "low",
      source: "preview.correlation",
      relatedEventIds: [1],
      data: {
        sessionId: "preview-session-1",
        note: "Abra via Electron para ativar correlacao persistida em SQLite.",
      },
      createdAt: new Date().toISOString(),
    },
  ];
}

function buildBrowserPreviewBootstrap(): DesktopBootstrap {
  const tools = buildPreviewTools();
  const workspaces = buildPreviewWorkspaces();
  const workspaceSessions = buildPreviewWorkspaceSessions();
  const alerts = buildPreviewAlerts();
  const updateStatus: UpdateStatus = {
    currentVersion: "1.0.0",
    latestVersion: "1.0.0",
    state: "mocked",
    lastCheckedAt: new Date().toISOString(),
    note: "Renderer em modo navegador. Abra via Electron para ativar IPC real.",
  };

  return {
    overview: {
      appName: "SECCURITY",
      runtimeMode: "browser-preview",
      osLabel: navigator.userAgent,
      storageEngine: "SQLite (mockado no preview web)",
      currentVersion: updateStatus.currentVersion,
      installedToolCount: 0,
      totalToolCount: tools.length,
      providerCount: 2,
      activeSessionCount: workspaceSessions.filter((session) => session.status === "active").length,
      workspaceCount: workspaces.length,
      eventCount: 1,
      alertCount: alerts.length,
      lastScanAt: null,
      updateStatus,
      providers: [
        {
          id: "ollama-local",
          name: "Ollama Local",
          kind: "ollama",
          baseUrl: "http://127.0.0.1:11434",
          modelHint: "llama3.1 / qwen / mistral",
          status: "configured",
          notes: "Mock local carregado pelo renderer.",
        },
        {
          id: "openai-compatible",
          name: "OpenAI-compatible",
          kind: "openai-compatible",
          baseUrl: "http://127.0.0.1:4000/v1",
          modelHint: "gateway / proxy / self-hosted",
          status: "attention",
          notes: "Disponivel para acoplamento futuro no modulo de providers.",
        },
      ],
      features: {
        console: {
          enabled: false,
          reason: "Console integrado indisponivel no preview web.",
        },
      },
    },
    tools,
    logs: [
      {
        id: 1,
        level: "info",
        scope: "preview",
        message: "Renderer em modo navegador carregado sem preload do Electron.",
        metadata: { source: "desktopClient" },
        createdAt: new Date().toISOString(),
      },
    ],
    sessions: [],
    workspaceSessions,
    workspaces,
    alerts,
    events: [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        source: "preview",
        type: "preview.log",
        target: "application",
        severity: "info",
        data: {
          message: "Modo preview ativo.",
        },
      },
    ],
  };
}

let previewBootstrap = buildBrowserPreviewBootstrap();

const browserPreviewApi: DesktopApi = {
  bootstrap: async () => previewBootstrap,
  listTools: async () => previewBootstrap.tools,
  saveTool: async (input: ToolSaveInput) => {
    const toolIndex = previewBootstrap.tools.findIndex((item) => item.id === input.toolId);
    if (toolIndex === -1) {
      throw new Error(`Ferramenta desconhecida no preview: ${input.toolId}`);
    }

    const currentTool = previewBootstrap.tools[toolIndex];
    const nextTool: DetectedTool = {
      ...currentTool,
      manualPath: input.executablePath,
      installPath: input.executablePath,
      launchable: Boolean(input.executablePath),
      detected: Boolean(input.executablePath),
      pathSource: input.executablePath ? "manual" : "missing",
      lastCheckedAt: new Date().toISOString(),
    };

    previewBootstrap = {
      ...previewBootstrap,
      tools: previewBootstrap.tools.map((tool, index) => (index === toolIndex ? nextTool : tool)),
    };

    return {
      ok: true,
      tool: nextTool,
      message: "Preview web atualizado localmente.",
    };
  },
  browseToolExecutablePath: async (): Promise<ToolBrowseResult> => ({
    canceled: true,
    executablePath: null,
  }),
  listWorkspaces: async () => previewBootstrap.workspaces,
  listWorkspaceSessions: async () => previewBootstrap.workspaceSessions,
  finishWorkspaceSession: async (sessionId: string): Promise<FinishWorkspaceSessionResult> => {
    let updatedSession: WorkspaceSession | null = null;

    previewBootstrap = {
      ...previewBootstrap,
      overview: {
        ...previewBootstrap.overview,
        activeSessionCount: Math.max(0, previewBootstrap.overview.activeSessionCount - 1),
      },
      workspaceSessions: previewBootstrap.workspaceSessions.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }

        updatedSession = {
          ...session,
          status: "finished",
          finishedAt: new Date().toISOString(),
        };

        return updatedSession;
      }),
    };

    if (!updatedSession) {
      throw new Error(`Sessao preview desconhecida: ${sessionId}`);
    }

    const finishedSession = updatedSession as WorkspaceSession;

    return {
      session: finishedSession,
      alertCount: previewBootstrap.alerts.length,
      message: `Sessao ${finishedSession.name} encerrada no preview.`,
    };
  },
  listAlerts: async () => previewBootstrap.alerts,
  createWorkspace: async (input: WorkspaceCreateInput) => {
    const workspaceId = `preview-workspace-${previewWorkspaceCounter++}`;
    const workspace: WorkspaceDefinition = {
      id: workspaceId,
      name: input.name.trim() || "Workspace preview",
      description: input.description?.trim() || "Workspace criado no preview web.",
      layoutMode: "manual",
      assignments: toolCatalog.map((tool, index) => ({
        workspaceId,
        toolId: tool.id,
        enabled: false,
        launchOrder: index,
        windowSlot: "manual",
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    previewBootstrap = {
      ...previewBootstrap,
      workspaces: [workspace, ...previewBootstrap.workspaces],
    };

    return workspace;
  },
  updateWorkspace: async (input: WorkspaceUpdateInput) => {
    const nextName = input.name.trim() || "Workspace preview";
    let updatedWorkspace: WorkspaceDefinition | null = null;

    previewBootstrap = {
      ...previewBootstrap,
      workspaces: previewBootstrap.workspaces.map((workspace) => {
        if (workspace.id !== input.workspaceId) {
          return workspace;
        }

        updatedWorkspace = {
          ...workspace,
          name: nextName,
          updatedAt: new Date().toISOString(),
        };

        return updatedWorkspace;
      }),
    };

    if (!updatedWorkspace) {
      throw new Error(`Workspace desconhecido no preview: ${input.workspaceId}`);
    }

    return updatedWorkspace;
  },
  updateWorkspaceAssignment: async (input: WorkspaceAssignmentUpdateInput) => {
    let updatedWorkspace: WorkspaceDefinition | null = null;

    previewBootstrap = {
      ...previewBootstrap,
      workspaces: previewBootstrap.workspaces.map((workspace) => {
        if (workspace.id !== input.workspaceId) {
          return workspace;
        }

        updatedWorkspace = {
          ...workspace,
          updatedAt: new Date().toISOString(),
          assignments: workspace.assignments.map((assignment) =>
            assignment.toolId === input.toolId
              ? {
                  ...assignment,
                  enabled: input.enabled,
                  launchOrder: input.launchOrder,
                  windowSlot: input.windowSlot,
                }
              : assignment
          ),
        };

        return updatedWorkspace;
      }),
    };

    if (!updatedWorkspace) {
      throw new Error(
        `Workspace desconhecido no preview para assignment: ${input.workspaceId}`
      );
    }

    return updatedWorkspace;
  },
  scanTools: async () => previewBootstrap.tools,
  launchTool: async (toolId) => ({
    ok: false,
    toolId,
    message: "Launcher indisponivel no preview web. Abra o app pelo Electron.",
  }),
  setToolExecutablePath: async (toolId, executablePath) => {
    const tool = buildPreviewTools().find((item) => item.id === toolId);
    if (!tool) {
      throw new Error(`Ferramenta desconhecida no preview: ${toolId}`);
    }

    const nextTool: DetectedTool = {
      ...tool,
      manualPath: executablePath,
      installPath: executablePath,
      launchable: Boolean(executablePath),
      detected: Boolean(executablePath),
      pathSource: executablePath ? "manual" : "missing",
    };

    const result = {
      ok: true,
      tool: nextTool,
      message: "Preview web atualizado localmente.",
    };

    await browserPreviewApi.saveTool({
      toolId,
      executablePath,
    });

    return result;
  },
  getLogs: async () => previewBootstrap.logs,
  getEvents: async () => previewBootstrap.events,
  checkForUpdates: async () => previewBootstrap.overview.updateStatus,
  launchWorkspace: async (workspaceId) => {
    const workspace = previewBootstrap.workspaces.find((entry) => entry.id === workspaceId);
    const sessionId = `preview-session-${previewWorkspaceSessionCounter++}`;
    const session: WorkspaceSession = {
      id: sessionId,
      name: `${workspace?.name ?? "Workspace"} @ preview`,
      workspaceId,
      workspaceName: workspace?.name ?? null,
      status: "active",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      createdAt: new Date().toISOString(),
    };

    previewBootstrap = {
      ...previewBootstrap,
      overview: {
        ...previewBootstrap.overview,
        activeSessionCount: previewBootstrap.overview.activeSessionCount + 1,
      },
      workspaceSessions: [session, ...previewBootstrap.workspaceSessions],
    };

    return {
      ok: true,
      workspaceId,
      sessionId,
      alertCount: previewBootstrap.alerts.length,
      launchedCount: 0,
      message: "Workspace executado em modo preview sem launcher real.",
    };
  },
  createTerminalSession: async (cwd?: string) => ensurePreviewTerminalSession(cwd),
  writeToTerminal: async (sessionId: string, data: string) => {
    const session = ensurePreviewTerminalSession();
    if (session.id !== sessionId) {
      throw new Error("Sessao de terminal preview desconhecida.");
    }

    const submittedCommand = data.replace(/\r?\n/g, "").trim();
    if (!submittedCommand) {
      emitPreviewTerminalOutput({
        sessionId,
        text: "\r\nPS> ",
        stream: "stdout",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    emitPreviewTerminalOutput({
      sessionId,
      text: `${submittedCommand}\r\n`,
      stream: "stdout",
      timestamp: new Date().toISOString(),
    });

    emitPreviewTerminalOutput({
      sessionId,
      text: `Modo preview: comando "${submittedCommand}" enviado ao mock local.\r\nPS> `,
      stream: "system",
      timestamp: new Date().toISOString(),
    });
  },
  stopTerminalSession: async (sessionId: string) => {
    if (!previewTerminalSession || previewTerminalSession.id !== sessionId) {
      return;
    }

    previewTerminalSession = {
      ...previewTerminalSession,
      isActive: false,
    };

    emitPreviewTerminalExit({
      sessionId,
      exitCode: 0,
      signal: null,
      timestamp: new Date().toISOString(),
    });
  },
  onTerminalOutput: (listener) => {
    previewTerminalOutputListeners.add(listener);

    return () => {
      previewTerminalOutputListeners.delete(listener);
    };
  },
  onTerminalExit: (listener) => {
    previewTerminalExitListeners.add(listener);

    return () => {
      previewTerminalExitListeners.delete(listener);
    };
  },
};

export const desktopClient: DesktopApi = window.seccurity ?? browserPreviewApi;
