import { desktopClient } from "./desktopClient";
import type { ToolSaveInput, WorkspaceCreateInput } from "../../shared/types";

export const databaseClient = {
  listTools: () => desktopClient.listTools(),
  saveTool: (input: ToolSaveInput) => desktopClient.saveTool(input),
  listWorkspaces: () => desktopClient.listWorkspaces(),
  createWorkspace: (input: WorkspaceCreateInput) => desktopClient.createWorkspace(input),
};
