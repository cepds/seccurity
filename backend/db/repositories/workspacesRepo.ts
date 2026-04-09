import { randomUUID } from "node:crypto";
import { getDatabase } from "../db";
import { toolCatalog } from "../../../shared/toolCatalog";
import type {
  ToolId,
  WorkspaceAppAssignment,
  WorkspaceCreateInput,
  WorkspaceDefinition,
  WorkspaceLayoutMode,
  WorkspaceUpdateInput,
  WorkspaceAssignmentUpdateInput,
  WorkspaceWindowSlot,
} from "../../../shared/types";

interface WorkspaceRow {
  id: string;
  name: string;
  description: string;
  layout_mode: WorkspaceLayoutMode;
  created_at: string;
  updated_at: string;
}

interface WorkspaceAssignmentRow {
  workspace_id: string;
  tool_id: ToolId;
  enabled: number;
  launch_order: number;
  window_slot: WorkspaceWindowSlot;
}

const defaultWorkspaceId = "primary-workspace";
const activeToolIds = new Set(toolCatalog.map((tool) => tool.id));

function mapAssignmentRow(row: WorkspaceAssignmentRow): WorkspaceAppAssignment {
  return {
    workspaceId: row.workspace_id,
    toolId: row.tool_id,
    enabled: Boolean(row.enabled),
    launchOrder: row.launch_order,
    windowSlot: row.window_slot,
  };
}

export function getAssignmentsForWorkspace(workspaceId: string): WorkspaceAppAssignment[] {
  const database = getDatabase();
  const rows = database
    .prepare(
      `
        SELECT workspace_id, tool_id, enabled, launch_order, window_slot
        FROM workspace_apps
        WHERE workspace_id = ?
        ORDER BY launch_order ASC, tool_id ASC
      `
    )
    .all(workspaceId) as WorkspaceAssignmentRow[];

  return rows.map(mapAssignmentRow).filter((assignment) => activeToolIds.has(assignment.toolId));
}

export function ensureDefaultWorkspace(): void {
  const database = getDatabase();
  const exists = database
    .prepare("SELECT id FROM workspaces WHERE id = ?")
    .get(defaultWorkspaceId) as { id: string } | undefined;

  const timestamp = new Date().toISOString();
  if (!exists) {
    database
      .prepare(
        `
          INSERT INTO workspaces (id, name, description, layout_mode, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        defaultWorkspaceId,
        "Primary Workspace",
        "Workspace padrao para agrupar apps e futuras regras de janela.",
        "manual",
        timestamp,
        timestamp
      );
  }

  const upsertAssignment = database.prepare(`
    INSERT INTO workspace_apps (
      workspace_id,
      tool_id,
      enabled,
      launch_order,
      window_slot,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(workspace_id, tool_id) DO UPDATE SET
      updated_at = excluded.updated_at
  `);

  const transaction = database.transaction(() => {
    database
      .prepare(
        `
          DELETE FROM workspace_apps
          WHERE workspace_id = ? AND tool_id NOT IN (${toolCatalog.map(() => "?").join(", ")})
        `
      )
      .run(defaultWorkspaceId, ...toolCatalog.map((tool) => tool.id));

    toolCatalog.forEach((tool, index) => {
      upsertAssignment.run(
        defaultWorkspaceId,
        tool.id,
        0,
        index,
        "manual",
        timestamp,
        timestamp
      );
    });
  });

  transaction();
}

function mapWorkspaceRow(row: WorkspaceRow): WorkspaceDefinition {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    layoutMode: row.layout_mode,
    assignments: getAssignmentsForWorkspace(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listWorkspaces(): WorkspaceDefinition[] {
  const database = getDatabase();
  const rows = database
    .prepare(
      `
        SELECT id, name, description, layout_mode, created_at, updated_at
        FROM workspaces
        ORDER BY datetime(updated_at) DESC, name ASC
      `
    )
    .all() as WorkspaceRow[];

  return rows.map(mapWorkspaceRow);
}

export function getWorkspaceById(workspaceId: string): WorkspaceDefinition | null {
  const database = getDatabase();
  const row = database
    .prepare(
      `
        SELECT id, name, description, layout_mode, created_at, updated_at
        FROM workspaces
        WHERE id = ?
      `
    )
    .get(workspaceId) as WorkspaceRow | undefined;

  return row ? mapWorkspaceRow(row) : null;
}

export function countWorkspaces(): number {
  const database = getDatabase();
  const row = database.prepare("SELECT COUNT(*) AS count FROM workspaces").get() as { count: number };
  return row.count;
}

export function createWorkspace(input: WorkspaceCreateInput): WorkspaceDefinition {
  const database = getDatabase();
  const timestamp = new Date().toISOString();
  const normalizedName = input.name.trim();

  if (!normalizedName) {
    throw new Error("O nome do workspace nao pode ficar vazio.");
  }

  const workspaceId = `workspace-${randomUUID()}`;
  const description = input.description?.trim() || "Workspace criado manualmente via IPC.";

  database
    .prepare(
      `
        INSERT INTO workspaces (id, name, description, layout_mode, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run(workspaceId, normalizedName, description, "manual", timestamp, timestamp);

  const insertAssignment = database.prepare(`
    INSERT INTO workspace_apps (
      workspace_id,
      tool_id,
      enabled,
      launch_order,
      window_slot,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = database.transaction(() => {
    toolCatalog.forEach((tool, index) => {
      insertAssignment.run(workspaceId, tool.id, 0, index, "manual", timestamp, timestamp);
    });
  });

  transaction();

  return {
    id: workspaceId,
    name: normalizedName,
    description,
    layoutMode: "manual",
    assignments: toolCatalog.map((tool, index) => ({
      workspaceId,
      toolId: tool.id,
      enabled: false,
      launchOrder: index,
      windowSlot: "manual",
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateWorkspace(input: WorkspaceUpdateInput): WorkspaceDefinition {
  const database = getDatabase();
  const normalizedName = input.name.trim();

  if (!normalizedName) {
    throw new Error("O nome do workspace nao pode ficar vazio.");
  }

  const workspace = getWorkspaceById(input.workspaceId);
  if (!workspace) {
    throw new Error(`Workspace nao encontrado: ${input.workspaceId}`);
  }

  const timestamp = new Date().toISOString();
  database
    .prepare(
      `
        UPDATE workspaces
        SET name = ?, updated_at = ?
        WHERE id = ?
      `
    )
    .run(normalizedName, timestamp, input.workspaceId);

  return {
    ...workspace,
    name: normalizedName,
    updatedAt: timestamp,
  };
}

export function updateWorkspaceAssignment(input: WorkspaceAssignmentUpdateInput): WorkspaceDefinition {
  const database = getDatabase();
  const workspace = getWorkspaceById(input.workspaceId);

  if (!workspace) {
    throw new Error(`Workspace nao encontrado: ${input.workspaceId}`);
  }

  const assignment = workspace.assignments.find((entry) => entry.toolId === input.toolId);
  if (!assignment) {
    throw new Error(`Associacao nao encontrada para ${input.toolId} em ${input.workspaceId}.`);
  }

  const timestamp = new Date().toISOString();
  database
    .prepare(
      `
        UPDATE workspace_apps
        SET enabled = ?, launch_order = ?, window_slot = ?, updated_at = ?
        WHERE workspace_id = ? AND tool_id = ?
      `
    )
    .run(
      input.enabled ? 1 : 0,
      input.launchOrder,
      input.windowSlot,
      timestamp,
      input.workspaceId,
      input.toolId
    );

  database
    .prepare(
      `
        UPDATE workspaces
        SET updated_at = ?
        WHERE id = ?
      `
    )
    .run(timestamp, input.workspaceId);

  return getWorkspaceById(input.workspaceId) ?? {
    ...workspace,
    updatedAt: timestamp,
    assignments: workspace.assignments.map((entry) =>
      entry.toolId === input.toolId
        ? {
            ...entry,
            enabled: input.enabled,
            launchOrder: input.launchOrder,
            windowSlot: input.windowSlot,
          }
        : entry
    ),
  };
}
