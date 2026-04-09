import type { DetectedTool, ToolId, ToolPathSource } from "../../../shared/types";
import { getDatabase } from "../db";
import { toolCatalog } from "../../../shared/toolCatalog";

export interface ToolRow {
  tool_id: ToolId;
  name: string;
  description: string;
  category: DetectedTool["category"];
  executable_name: string;
  auto_detected_path: string | null;
  manual_path: string | null;
  resolved_path: string | null;
  path_source: ToolPathSource;
  version: string | null;
  detected: number;
  launchable: number;
  last_checked_at: string | null;
  last_launched_at: string | null;
}

function mapRow(row: ToolRow): ToolRow {
  return {
    tool_id: row.tool_id,
    name: row.name,
    description: row.description,
    category: row.category,
    executable_name: row.executable_name,
    auto_detected_path: row.auto_detected_path,
    manual_path: row.manual_path,
    resolved_path: row.resolved_path,
    path_source: row.path_source,
    version: row.version,
    detected: row.detected,
    launchable: row.launchable,
    last_checked_at: row.last_checked_at,
    last_launched_at: row.last_launched_at,
  };
}

export function listToolRows(): ToolRow[] {
  const database = getDatabase();
  const activeToolIds = new Set(toolCatalog.map((tool) => tool.id));
  const rows = database
    .prepare(
      `
        SELECT
          tool_id,
          name,
          description,
          category,
          executable_name,
          auto_detected_path,
          manual_path,
          resolved_path,
          path_source,
          version,
          detected,
          launchable,
          last_checked_at,
          last_launched_at
        FROM tools
        ORDER BY name ASC
      `
    )
    .all() as ToolRow[];

  return rows.map(mapRow).filter((row) => activeToolIds.has(row.tool_id));
}

export function getToolRowMap(): Map<ToolId, ToolRow> {
  return new Map(listToolRows().map((row) => [row.tool_id, row]));
}

export function updateToolManualPath(toolId: ToolId, manualPath: string | null): void {
  const database = getDatabase();
  database
    .prepare(
      `
        UPDATE tools
        SET manual_path = ?, updated_at = ?
        WHERE tool_id = ?
      `
    )
    .run(manualPath, new Date().toISOString(), toolId);
}

export function markToolAsLaunched(toolId: ToolId): void {
  const database = getDatabase();
  const timestamp = new Date().toISOString();

  database
    .prepare(
      `
        UPDATE tools
        SET last_launched_at = ?, updated_at = ?
        WHERE tool_id = ?
      `
    )
    .run(timestamp, timestamp, toolId);
}

export function upsertTool(tool: DetectedTool): void {
  const database = getDatabase();
  const timestamp = new Date().toISOString();

  database
    .prepare(
      `
        INSERT INTO tools (
          tool_id,
          name,
          description,
          category,
          executable_name,
          auto_detected_path,
          manual_path,
          resolved_path,
          path_source,
          version,
          detected,
          launchable,
          last_checked_at,
          last_launched_at,
          created_at,
          updated_at
        )
        VALUES (
          @id,
          @name,
          @description,
          @category,
          @executableName,
          @autoDetectedPath,
          @manualPath,
          @installPath,
          @pathSource,
          @version,
          @detected,
          @launchable,
          @lastCheckedAt,
          @lastLaunchedAt,
          @createdAt,
          @updatedAt
        )
        ON CONFLICT(tool_id) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          category = excluded.category,
          executable_name = excluded.executable_name,
          auto_detected_path = excluded.auto_detected_path,
          manual_path = excluded.manual_path,
          resolved_path = excluded.resolved_path,
          path_source = excluded.path_source,
          version = excluded.version,
          detected = excluded.detected,
          launchable = excluded.launchable,
          last_checked_at = excluded.last_checked_at,
          last_launched_at = excluded.last_launched_at,
          updated_at = excluded.updated_at
      `
    )
    .run({
      ...tool,
      detected: tool.detected ? 1 : 0,
      launchable: tool.launchable ? 1 : 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
}

export function persistTools(tools: DetectedTool[]): void {
  const database = getDatabase();
  const transaction = database.transaction((entries: DetectedTool[]) => {
    const activeToolIds = entries.map((entry) => entry.id);
    if (activeToolIds.length > 0) {
      const placeholders = activeToolIds.map(() => "?").join(", ");
      database
        .prepare(`DELETE FROM tools WHERE tool_id NOT IN (${placeholders})`)
        .run(...activeToolIds);
    }

    entries.forEach(upsertTool);
  });

  transaction(tools);
}
