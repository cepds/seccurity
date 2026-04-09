import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { app, shell } from "electron";
import { clearRegistryCache, findRegistryInstallPaths } from "../../backend/registry";
import {
  getToolRowMap,
  listToolRows,
  markToolAsLaunched,
  persistTools,
  updateToolManualPath,
  upsertTool,
  type ToolRow,
} from "../../backend/db/repositories/toolsRepo";
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

interface AutomaticDetectionResult {
  source: Exclude<ToolPathSource, "manual" | "missing" | "auto">;
  path: string;
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

function wildcardSegmentToRegex(segment: string): RegExp {
  const escaped = segment.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

function expandWildcardPath(templatePath: string): string[] {
  const normalized = path.normalize(templatePath);
  if (!normalized.includes("*")) {
    return [normalized];
  }

  const parsed = path.parse(normalized);
  const root = parsed.root || path.sep;
  const remainder = normalized.slice(root.length);
  const segments = remainder.split(path.sep).filter(Boolean);

  let currentRoots = [root];

  for (const segment of segments) {
    const hasWildcard = segment.includes("*");
    const nextRoots: string[] = [];

    for (const currentRoot of currentRoots) {
      if (!hasWildcard) {
        nextRoots.push(path.join(currentRoot, segment));
        continue;
      }

      try {
        const entries = fs.readdirSync(currentRoot, { withFileTypes: true });
        const matcher = wildcardSegmentToRegex(segment);
        for (const entry of entries) {
          if (!entry.isDirectory() && segment !== segments.at(-1)) {
            continue;
          }

          if (matcher.test(entry.name)) {
            nextRoots.push(path.join(currentRoot, entry.name));
          }
        }
      } catch {
        continue;
      }
    }

    currentRoots = unique(nextRoots);

    if (currentRoots.length === 0) {
      break;
    }
  }

  return currentRoots;
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

function resolveManualPath(storedRow: ToolRow | undefined): string | null {
  if (!storedRow?.manual_path) {
    return null;
  }

  return fileExists(storedRow.manual_path) ? storedRow.manual_path : null;
}

function resolveAutomaticPath(definition: ToolDefinition): AutomaticDetectionResult | null {
  const registryPath = findRegistryInstallPaths(definition).find(fileExists);
  if (registryPath) {
    return {
      source: "registry",
      path: registryPath,
    };
  }

  const wherePath = findOnPath(definition.executableNames).find(fileExists);
  if (wherePath) {
    return {
      source: "where",
      path: wherePath,
    };
  }

  const commonPath = definition.commonPathTemplates
    .flatMap((template) => expandWildcardPath(expandTemplate(template)))
    .find(fileExists);
  if (commonPath) {
    return {
      source: "common",
      path: commonPath,
    };
  }

  return null;
}

function detectTool(definition: ToolDefinition, storedRow: ToolRow | undefined): DetectedTool {
  const checkedAt = new Date().toISOString();
  const manualPath = storedRow?.manual_path ?? null;
  const validManualPath = resolveManualPath(storedRow);
  const automaticPath = resolveAutomaticPath(definition);
  const installPath = validManualPath ?? automaticPath?.path ?? null;
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
    autoDetectedPath: automaticPath?.path ?? null,
    manualPath,
    installPath,
    pathSource: validManualPath ? "manual" : automaticPath?.source ?? "missing",
    version,
    launchable: installPath !== null,
    lastCheckedAt: checkedAt,
    lastLaunchedAt: storedRow?.last_launched_at ?? null,
  };
}

function getStoredToolMap(): Map<ToolId, ToolRow> {
  return getToolRowMap();
}

export function syncToolRegistry(): void {
  clearRegistryCache();
  const storedRows = getStoredToolMap();
  const tools = toolCatalog.map((definition) => detectTool(definition, storedRows.get(definition.id)));
  persistTools(tools);
}

export function getCachedTools(): DetectedTool[] {
  const rows = listToolRows();
  if (rows.length === 0) {
    return toolCatalog.map(buildFallbackTool);
  }

  return rows.map(toDetectedTool);
}

export function scanInstalledTools(): DetectedTool[] {
  clearRegistryCache();
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

  const nextManualPath = executablePath?.trim() || null;
  updateToolManualPath(toolId, nextManualPath);

  clearRegistryCache();
  const tool = detectTool(definition, getStoredToolMap().get(toolId));
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

export async function getToolIcon(executablePath: string | null): Promise<string | null> {
  if (!executablePath || !fileExists(executablePath)) {
    return null;
  }

  try {
    const icon = await app.getFileIcon(executablePath, { size: "small" });
    return icon.isEmpty() ? null : icon.toDataURL();
  } catch {
    return null;
  }
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
