import { toolCatalog } from "../../shared/toolCatalog";
import type {
  DesktopApi,
  DesktopBootstrap,
  DetectedTool,
  ToolBrowseResult,
  ToolSaveInput,
  UpdateStatus,
  WorkspaceCreateInput,
  WorkspaceDefinition,
} from "../../shared/types";

let previewWorkspaceCounter = 1;

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

function buildBrowserPreviewBootstrap(): DesktopBootstrap {
  const tools = buildPreviewTools();
  const workspaces = buildPreviewWorkspaces();
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
      activeSessionCount: 0,
      workspaceCount: workspaces.length,
      eventCount: 1,
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
    workspaces,
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
  launchWorkspace: async (workspaceId) => ({
    ok: false,
    workspaceId,
    launchedCount: 0,
    message: "Workspace manager indisponivel no preview web. Abra o app pelo Electron.",
  }),
};

export const desktopClient: DesktopApi = window.seccurity ?? browserPreviewApi;
