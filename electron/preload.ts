import { contextBridge, ipcRenderer } from "electron";
import type {
  DesktopApi,
  TerminalExitEvent,
  TerminalOutputChunk,
  ToolId,
  ToolSaveInput,
  WorkspaceAssignmentUpdateInput,
  WorkspaceCreateInput,
  WorkspaceUpdateInput,
} from "../shared/types";
import { terminalChannels } from "./services/ipcChannels";

const desktopApi: DesktopApi = {
  bootstrap: () => ipcRenderer.invoke("seccurity:bootstrap"),
  listTools: () => ipcRenderer.invoke("tools:list"),
  saveTool: (input: ToolSaveInput) => ipcRenderer.invoke("tools:save", input),
  browseToolExecutablePath: (toolId: ToolId) => ipcRenderer.invoke("tools:browse-executable", toolId),
  listWorkspaces: () => ipcRenderer.invoke("workspaces:list"),
  createWorkspace: (input: WorkspaceCreateInput) => ipcRenderer.invoke("workspaces:create", input),
  updateWorkspace: (input: WorkspaceUpdateInput) => ipcRenderer.invoke("workspaces:update", input),
  updateWorkspaceAssignment: (input: WorkspaceAssignmentUpdateInput) =>
    ipcRenderer.invoke("workspaces:update-assignment", input),
  scanTools: () => ipcRenderer.invoke("seccurity:scan-tools"),
  launchTool: (toolId: ToolId) => ipcRenderer.invoke("seccurity:launch-tool", toolId),
  setToolExecutablePath: (toolId: ToolId, executablePath: string | null) =>
    ipcRenderer.invoke("seccurity:set-tool-path", toolId, executablePath),
  getLogs: (limit?: number) => ipcRenderer.invoke("seccurity:get-logs", limit),
  getEvents: (limit?: number) => ipcRenderer.invoke("seccurity:get-events", limit),
  checkForUpdates: () => ipcRenderer.invoke("seccurity:check-updates"),
  launchWorkspace: (workspaceId: string) =>
    ipcRenderer.invoke("seccurity:launch-workspace", workspaceId),
  createTerminalSession: (cwd?: string) => ipcRenderer.invoke("terminal:create-session", cwd),
  writeToTerminal: (sessionId: string, data: string) =>
    ipcRenderer.invoke("terminal:write", { sessionId, data }),
  stopTerminalSession: (sessionId: string) => ipcRenderer.invoke("terminal:stop", sessionId),
  onTerminalOutput: (listener: (chunk: TerminalOutputChunk) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: TerminalOutputChunk) => {
      listener(chunk);
    };

    ipcRenderer.on(terminalChannels.output, handler);

    return () => {
      ipcRenderer.removeListener(terminalChannels.output, handler);
    };
  },
  onTerminalExit: (listener: (event: TerminalExitEvent) => void) => {
    const handler = (_ipcEvent: Electron.IpcRendererEvent, event: TerminalExitEvent) => {
      listener(event);
    };

    ipcRenderer.on(terminalChannels.exit, handler);

    return () => {
      ipcRenderer.removeListener(terminalChannels.exit, handler);
    };
  },
};

contextBridge.exposeInMainWorld("seccurity", desktopApi);
