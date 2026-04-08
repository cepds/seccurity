import { desktopClient } from "./desktopClient";
import type { ToolSaveInput, WorkspaceCreateInput } from "../../shared/types";

export const databaseClient = {
  listTools: () => desktopClient.listTools(),
  saveTool: (input: ToolSaveInput) => desktopClient.saveTool(input),
  browseToolExecutablePath: (toolId: ToolSaveInput["toolId"]) =>
    desktopClient.browseToolExecutablePath(toolId),
  listWorkspaces: () => desktopClient.listWorkspaces(),
  createWorkspace: (input: WorkspaceCreateInput) => desktopClient.createWorkspace(input),
};
