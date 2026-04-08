import path from "node:path";
import { app, BrowserWindow } from "electron";
import { initDatabase } from "./services/database";
import { logEvent } from "./services/logger";
import { syncProviderRegistry } from "./services/providerService";
import { registerIpcHandlers } from "./services/ipc";
import { syncToolRegistry } from "./services/toolService";
import { ensureDefaultWorkspace } from "./services/workspaceService";

const isDevelopment = !app.isPackaged;
const projectRoot = path.join(__dirname, "..", "..");
const rendererDistPath = path.join(projectRoot, "www");
const preloadPath = path.join(__dirname, "preload.js");

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 1220,
    minHeight: 780,
    backgroundColor: "#08101b",
    autoHideMenuBar: true,
    title: "SECCURITY",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (isDevelopment && devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.join(rendererDistPath, "index.html"));
  }

  return mainWindow;
}

async function bootstrap(): Promise<void> {
  app.setName("SECCURITY");
  initDatabase(app.getPath("userData"));
  syncProviderRegistry();
  syncToolRegistry();
  ensureDefaultWorkspace();
  registerIpcHandlers();
  logEvent("success", "core", "Aplicacao principal inicializada.", {
    userDataPath: app.getPath("userData"),
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

app.whenReady().then(() => {
  void bootstrap();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
