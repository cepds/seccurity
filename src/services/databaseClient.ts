import { desktopClient } from "./desktopClient";
import type {
  ToolSaveInput,
  WorkspaceAssignmentUpdateInput,
  WorkspaceCreateInput,
  WorkspaceUpdateInput,
} from "../../shared/types";

export const databaseClient = {
  listTools: () => desktopClient.listTools(),
  saveTool: (input: ToolSaveInput) => desktopClient.saveTool(input),
  browseToolExecutablePath: (toolId: ToolSaveInput["toolId"]) =>
    desktopClient.browseToolExecutablePath(toolId),
  listWorkspaces: () => desktopClient.listWorkspaces(),
  listWorkspaceSessions: () => desktopClient.listWorkspaceSessions(),
  finishWorkspaceSession: (sessionId: string) => desktopClient.finishWorkspaceSession(sessionId),
  listAlerts: () => desktopClient.listAlerts(),
  createWorkspace: (input: WorkspaceCreateInput) => desktopClient.createWorkspace(input),
  updateWorkspace: (input: WorkspaceUpdateInput) => desktopClient.updateWorkspace(input),
  updateWorkspaceAssignment: (input: WorkspaceAssignmentUpdateInput) =>
    desktopClient.updateWorkspaceAssignment(input),
};
