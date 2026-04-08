import { app, BrowserWindow } from "electron";
import { initDatabase } from "./services/database";
import { logEvent } from "./services/logger";
import { syncProviderRegistry } from "./services/providerService";
import { registerIpcHandlers } from "./services/ipc";
import { syncToolRegistry } from "./services/toolService";
import { disposeTerminalSessions } from "./services/terminalService";
import { ensureDefaultWorkspace } from "./services/workspaceService";

export interface MainProcessOptions {
  databasePath: string;
  devServerUrl?: string;
  isDevelopment: boolean;
  preloadPath: string;
  rendererIndexPath: string;
}

export function createWindow(options: MainProcessOptions): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 1220,
    minHeight: 780,
    backgroundColor: "#08101b",
    autoHideMenuBar: true,
    title: "SECCURITY",
    webPreferences: {
      preload: options.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (options.isDevelopment && options.devServerUrl) {
    void mainWindow.loadURL(options.devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(options.rendererIndexPath);
  }

  return mainWindow;
}

export async function bootstrapMainProcess(options: MainProcessOptions): Promise<void> {
  app.setName("SECCURITY");
  initDatabase(options.databasePath);
  syncProviderRegistry();
  syncToolRegistry();
  ensureDefaultWorkspace();
  registerIpcHandlers();
  logEvent("success", "core", "Aplicacao principal inicializada.", {
    userDataPath: app.getPath("userData"),
  });

  createWindow(options);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(options);
    }
  });
}

export function registerMainProcess(options: MainProcessOptions): void {
  app.whenReady().then(() => {
    void bootstrapMainProcess(options);
  });

  app.on("window-all-closed", () => {
    disposeTerminalSessions();

    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
