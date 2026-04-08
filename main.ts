import path from "node:path";
import { app } from "electron";
import { registerMainProcess } from "./electron/main";

const dbPath = path.join(app.getPath("userData"), "seccurity.db");

registerMainProcess({
  databasePath: dbPath,
  preloadPath: path.join(__dirname, "preload.js"),
  rendererIndexPath: path.join(__dirname, "../dist/index.html"),
  isDevelopment: !app.isPackaged,
  devServerUrl: process.env.VITE_DEV_SERVER_URL,
});
