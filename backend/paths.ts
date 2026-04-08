import path from "node:path";
import { app } from "electron";

export function resolveBackendPath(...segments: string[]): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "backend", ...segments);
  }

  return path.join(app.getAppPath(), "backend", ...segments);
}
