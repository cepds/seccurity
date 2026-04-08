import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { shell } from "electron";
import { getDatabase } from "./database";
import { createSession } from "./sessionService";
import { logEvent } from "./logger";
import { toolCatalog } from "../../shared/toolCatalog";
import type {
  DetectedTool,
  LaunchToolResult,
  SetToolExecutablePathResult,
  ToolDefinition,
  ToolId,
  ToolPathSource,
} from "../../shared/types";

interface ToolRow {
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

const pathTokens = {
  programFiles: process.env.ProgramFiles ?? "C:\\Program Files",
  programFilesX86: process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
  localAppData:
    process.env.LOCALAPPDATA ??
    path.join(process.env.USERPROFILE ?? "C:\\Users\\Public", "AppData", "Local"),
  userProfile: process.env.USERPROFILE ?? "C:\\Users\\Public",
  downloads: path.join(process.env.USERPROFILE ?? "C:\\Users\\Public", "Downloads"),
  tools: "C:\\Tools",
};

function fileExists(candidatePath: string): boolean {
  try {
    return fs.statSync(candidatePath).isFile();
  } catch {
    return false;
  }
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function expandTemplate(template: string): string {
  return template.replace(/\{([^}]+)\}/g, (_, token: keyof typeof pathTokens) => pathTokens[token] ?? "");
}

function findOnPath(executableNames: string[]): string[] {
  const matches: string[] = [];

  for (const executableName of executableNames) {
    const result = spawnSync("where.exe", [executableName], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 2500,
    });

    if (result.status === 0 && result.stdout) {
      matches.push(
        ...result.stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      );
    }
  }

  return unique(matches);
}

function resolveCandidatePaths(definition: ToolDefinition): string[] {
  const expandedPaths = definition.commonPathTemplates.map(expandTemplate);
  return unique([...findOnPath(definition.executableNames), ...expandedPaths]);
}

function readWindowsFileVersion(executablePath: string): string | null {
  const escapedPath = executablePath.replace(/'/g, "''");
  const command = `(Get-Item -LiteralPath '${escapedPath}').VersionInfo.ProductVersion`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 3500,
  });

  if (result.status !== 0) {
    return null;
  }

  const version = result.stdout.trim();
  return version || null;
}

function extractVersionFromOutput(rawOutput: string): string | null {
  const firstLine = rawOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return null;
  }

  const versionMatch = firstLine.match(/(\d+(?:\.\d+){1,3})/);
  return versionMatch?.[1] ?? firstLine;
}

function readExecutableVersion(
  executablePath: string,
  versionCommand: string[] | undefined
): string | null {
  if (!versionCommand?.length) {
    return null;
  }

  const result = spawnSync(executablePath, versionCommand, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 4000,
  });

  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  return combinedOutput ? extractVersionFromOutput(combinedOutput) : null;
}

function getStoredToolRows(): ToolRow[] {
  const database = getDatabase();
  return database
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
}

function getStoredToolMap(): Map<ToolId, ToolRow> {
  return new Map(getStoredToolRows().map((row) => [row.tool_id, row]));
}

function toDetectedTool(row: ToolRow): DetectedTool {
  return {
    id: row.tool_id,
    name: row.name,
    description: row.description,
    category: row.category,
    detected: Boolean(row.detected),
    executableName: row.executable_name,
    autoDetectedPath: row.auto_detected_path,
    manualPath: row.manual_path,
    installPath: row.resolved_path,
    pathSource: row.path_source,
    version: row.version,
    launchable: Boolean(row.launchable),
    lastCheckedAt: row.last_checked_at,
    lastLaunchedAt: row.last_launched_at,
  };
}

function buildFallbackTool(definition: ToolDefinition): DetectedTool {
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    detected: false,
    executableName: definition.executableNames[0],
    autoDetectedPath: null,
    manualPath: null,
    installPath: null,
    pathSource: "missing",
    version: null,
    launchable: false,
    lastCheckedAt: null,
    lastLaunchedAt: null,
  };
}

function upsertTool(tool: DetectedTool): void {
  const database = getDatabase();
  const now = new Date().toISOString();

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
      createdAt: now,
      updatedAt: now,
    });
}

function persistTools(tools: DetectedTool[]): void {
  const database = getDatabase();
  const transaction = database.transaction((entries: DetectedTool[]) => {
    entries.forEach(upsertTool);
  });

  transaction(tools);
}

function resolveManualPath(storedRow: ToolRow | undefined): string | null {
  if (!storedRow?.manual_path) {
    return null;
  }

  return fileExists(storedRow.manual_path) ? storedRow.manual_path : null;
}

function detectTool(definition: ToolDefinition, storedRow: ToolRow | undefined): DetectedTool {
  const checkedAt = new Date().toISOString();
  const manualPath = storedRow?.manual_path ?? null;
  const validManualPath = resolveManualPath(storedRow);
  const autoDetectedPath = resolveCandidatePaths(definition).find(fileExists) ?? null;
  const installPath = validManualPath ?? autoDetectedPath;
  const pathSource: ToolPathSource = validManualPath
    ? "manual"
    : autoDetectedPath
      ? "auto"
      : "missing";
  const version =
    installPath === null
      ? null
      : readExecutableVersion(installPath, definition.versionCommand) ??
        readWindowsFileVersion(installPath);

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    detected: installPath !== null,
    executableName: definition.executableNames[0],
    autoDetectedPath,
    manualPath,
    installPath,
    pathSource,
    version,
    launchable: installPath !== null,
    lastCheckedAt: checkedAt,
    lastLaunchedAt: storedRow?.last_launched_at ?? null,
  };
}

export function syncToolRegistry(): void {
  const storedRows = getStoredToolMap();
  const defaults = toolCatalog.map((definition) => detectTool(definition, storedRows.get(definition.id)));
  persistTools(defaults);
}

export function getCachedTools(): DetectedTool[] {
  const rows = getStoredToolRows();
  if (rows.length === 0) {
    return toolCatalog.map(buildFallbackTool);
  }

  return rows.map(toDetectedTool);
}

export function scanInstalledTools(): DetectedTool[] {
  const storedRows = getStoredToolMap();
  const tools = toolCatalog.map((definition) => detectTool(definition, storedRows.get(definition.id)));
  persistTools(tools);

  const installedCount = tools.filter((tool) => tool.detected).length;
  logEvent("success", "tools", "Varredura local de aplicativos concluida.", {
    installedCount,
    totalCount: tools.length,
  });

  return tools;
}

function getToolById(toolId: ToolId): DetectedTool | null {
  return getCachedTools().find((tool) => tool.id === toolId) ?? null;
}

export function setManualToolExecutablePath(
  toolId: ToolId,
  executablePath: string | null
): SetToolExecutablePathResult {
  const definition = toolCatalog.find((tool) => tool.id === toolId);
  if (!definition) {
    throw new Error(`Ferramenta desconhecida: ${toolId}`);
  }

  const storedRows = getStoredToolMap();
  const nextManualPath = executablePath?.trim() || null;
  const storedRow = storedRows.get(toolId);

  if (storedRow) {
    const database = getDatabase();
    database
      .prepare(
        `
          UPDATE tools
          SET manual_path = ?, updated_at = ?
          WHERE tool_id = ?
        `
      )
      .run(nextManualPath, new Date().toISOString(), toolId);
  }

  const refreshedRows = getStoredToolMap();
  const tool = detectTool(definition, refreshedRows.get(toolId));
  upsertTool(tool);

  const message = nextManualPath
    ? `Caminho manual atualizado para ${definition.name}.`
    : `Caminho manual removido para ${definition.name}.`;

  logEvent("info", "tools.config", message, {
    toolId,
    manualPath: nextManualPath,
    resolvedPath: tool.installPath,
    pathSource: tool.pathSource,
  });

  return {
    ok: true,
    tool,
    message,
  };
}

function markToolAsLaunched(toolId: ToolId): void {
  const database = getDatabase();
  database
    .prepare(
      `
        UPDATE tools
        SET last_launched_at = ?, updated_at = ?
        WHERE tool_id = ?
      `
    )
    .run(new Date().toISOString(), new Date().toISOString(), toolId);
}

export async function launchTool(
  toolId: ToolId,
  launchSource = "launcher",
  workspaceId: string | null = null,
  workspaceSessionId: string | null = null
): Promise<LaunchToolResult> {
  const definition = toolCatalog.find((tool) => tool.id === toolId);

  if (!definition) {
    const message = `Ferramenta desconhecida: ${toolId}`;
    logEvent("error", "launcher", message);
    return { ok: false, toolId, message };
  }

  const detectedTool = getToolById(toolId) ?? detectTool(definition, undefined);

  if (!detectedTool.installPath) {
    const message = `${definition.name} nao foi encontrado neste Windows.`;
    logEvent("warn", "launcher", message, { toolId });
    return { ok: false, toolId, message };
  }

  const openError = await shell.openPath(detectedTool.installPath);
  if (openError) {
    const failedSession = createSession({
      toolId,
      workspaceId,
      executablePath: detectedTool.installPath,
      launchSource,
      status: "failed",
      metadata: {
        error: openError,
        workspaceSessionId,
      },
    });

    logEvent("error", "launcher", "Falha ao abrir executavel detectado.", {
      toolId,
      workspaceId,
      workspaceSessionId,
      installPath: detectedTool.installPath,
      error: openError,
      sessionId: failedSession.id,
    });

    return {
      ok: false,
      toolId,
      message: `Nao foi possivel abrir ${definition.name}: ${openError}`,
      sessionId: failedSession.id,
    };
  }

  markToolAsLaunched(toolId);
  const session = createSession({
    toolId,
    workspaceId,
    executablePath: detectedTool.installPath,
    launchSource,
    status: "active",
    metadata: {
      pathSource: detectedTool.pathSource,
      workspaceSessionId,
    },
  });

  logEvent("info", "launcher", "Executavel iniciado a partir do launcher local.", {
    toolId,
    workspaceId,
    workspaceSessionId,
    installPath: detectedTool.installPath,
    sessionId: session.id,
  });

  return {
    ok: true,
    toolId,
    message: `${definition.name} aberto com sucesso.`,
    sessionId: session.id,
  };
}
