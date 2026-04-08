import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi, ToolId } from "../shared/types";

const desktopApi: DesktopApi = {
  bootstrap: () => ipcRenderer.invoke("seccurity:bootstrap"),
  scanTools: () => ipcRenderer.invoke("seccurity:scan-tools"),
  launchTool: (toolId: ToolId) => ipcRenderer.invoke("seccurity:launch-tool", toolId),
  setToolExecutablePath: (toolId: ToolId, executablePath: string | null) =>
    ipcRenderer.invoke("seccurity:set-tool-path", toolId, executablePath),
  getLogs: (limit?: number) => ipcRenderer.invoke("seccurity:get-logs", limit),
  getEvents: (limit?: number) => ipcRenderer.invoke("seccurity:get-events", limit),
  checkForUpdates: () => ipcRenderer.invoke("seccurity:check-updates"),
  launchWorkspace: (workspaceId: string) =>
    ipcRenderer.invoke("seccurity:launch-workspace", workspaceId),
};

contextBridge.exposeInMainWorld("seccurity", desktopApi);
