import { toolCatalog } from "../../shared/toolCatalog";
import {
  countWorkspaces,
  createWorkspace,
  ensureDefaultWorkspace,
  getWorkspaceById,
  listWorkspaces,
  updateWorkspace,
  updateWorkspaceAssignment,
} from "../../backend/db/repositories/workspacesRepo";
import { recordStandardizedEvent } from "./eventService";
import { logEvent } from "./logger";
import { launchTool } from "./toolService";
import { runCorrelation, startSession } from "./workspaceSessionService";
import type { OpenWorkspaceResult } from "../../shared/types";

export {
  countWorkspaces,
  createWorkspace,
  ensureDefaultWorkspace,
  listWorkspaces,
  updateWorkspace,
  updateWorkspaceAssignment,
};

export async function launchWorkspace(workspaceId: string): Promise<OpenWorkspaceResult> {
  const workspace = getWorkspaceById(workspaceId);
  if (!workspace) {
    return {
      ok: false,
      workspaceId,
      launchedCount: 0,
      message: "Workspace nao encontrado.",
    };
  }

  const session = startSession(workspaceId);
  const enabledAssignments = workspace.assignments
    .filter((assignment) => assignment.enabled)
    .sort((left, right) => left.launchOrder - right.launchOrder);

  let launchedCount = 0;

  for (const assignment of enabledAssignments) {
    const result = await launchTool(assignment.toolId, "workspace", workspace.id, session.id);
    const toolDefinition = toolCatalog.find((tool) => tool.id === assignment.toolId);

    recordStandardizedEvent({
      source: "workspace-session",
      type: result.ok ? "workspace.session.tool.opened" : "workspace.session.tool.launch.failed",
      target: assignment.toolId,
      severity: result.ok ? "low" : "high",
      data: {
        sessionId: session.id,
        sessionName: session.name,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        toolId: assignment.toolId,
        toolName: toolDefinition?.name ?? assignment.toolId,
        launchOrder: assignment.launchOrder,
        windowSlot: assignment.windowSlot,
        appSessionId: result.sessionId ?? null,
        message: result.message,
      },
    });

    if (result.ok) {
      launchedCount += 1;
    }
  }

  recordStandardizedEvent({
    source: "workspace-session",
    type: "workspace.session.completed",
    target: workspace.id,
    severity: launchedCount > 0 ? "info" : "medium",
    data: {
      sessionId: session.id,
      sessionName: session.name,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      launchedCount,
      attemptedCount: enabledAssignments.length,
    },
  });

  const alerts = runCorrelation(session.id);
  const message =
    launchedCount > 0
      ? `Workspace ${workspace.name} iniciou ${launchedCount} app(s) na sessao ${session.name}.`
      : `Workspace ${workspace.name} nao possui apps habilitados ou detectados.`;

  logEvent("info", "workspace", "Execucao do workspace concluida.", {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    sessionId: session.id,
    launchedCount,
    alertCount: alerts.length,
  });

  return {
    ok: launchedCount > 0,
    workspaceId: workspace.id,
    sessionId: session.id,
    alertCount: alerts.length,
    launchedCount,
    message,
  };
}
