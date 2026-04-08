import path from "node:path";
import { spawnSync } from "node:child_process";
import type { ToolDefinition } from "../shared/types";

interface RegistryProgramEntry {
  displayName: string | null;
  displayIcon: string | null;
  installLocation: string | null;
  publisher: string | null;
  uninstallString: string | null;
}

function normalizeRegistryValue(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function parseExecutableFromCommand(rawValue: string | null): string | null {
  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.trim();
  if (!normalized) {
    return null;
  }

  const quotedMatch = normalized.match(/^"([^"]+?\.exe)(?:,[^"]*)?"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const bareMatch = normalized.match(/^([A-Za-z]:\\.+?\.exe)(?:,\d+)?\b/i);
  if (bareMatch?.[1]) {
    return bareMatch[1];
  }

  return null;
}

function readRegistryPrograms(): RegistryProgramEntry[] {
  const script = `
    $paths = @(
      'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
    )

    $items = Get-ItemProperty -Path $paths -ErrorAction SilentlyContinue |
      Select-Object DisplayName, DisplayIcon, InstallLocation, Publisher, UninstallString

    $items | ConvertTo-Json -Compress
  `;

  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 5000,
  });

  if (result.status !== 0 || !result.stdout.trim()) {
    return [];
  }

  try {
    const payload = JSON.parse(result.stdout) as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | null;
    if (!payload) {
      return [];
    }

    const rows = Array.isArray(payload) ? payload : [payload];

    return rows.map((row) => ({
      displayName: normalizeRegistryValue(typeof row.DisplayName === "string" ? row.DisplayName : null),
      displayIcon: normalizeRegistryValue(typeof row.DisplayIcon === "string" ? row.DisplayIcon : null),
      installLocation: normalizeRegistryValue(
        typeof row.InstallLocation === "string" ? row.InstallLocation : null
      ),
      publisher: normalizeRegistryValue(typeof row.Publisher === "string" ? row.Publisher : null),
      uninstallString: normalizeRegistryValue(
        typeof row.UninstallString === "string" ? row.UninstallString : null
      ),
    }));
  } catch {
    return [];
  }
}

let registryCache: RegistryProgramEntry[] | null = null;

export function clearRegistryCache(): void {
  registryCache = null;
}

export function listRegistryPrograms(): RegistryProgramEntry[] {
  if (!registryCache) {
    registryCache = readRegistryPrograms();
  }

  return registryCache;
}

function matchesDisplayName(definition: ToolDefinition, displayName: string | null): boolean {
  if (!displayName) {
    return false;
  }

  const normalized = displayName.toLowerCase();
  const patterns = definition.registryDisplayNames ?? [definition.name];
  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

function buildRegistryCandidates(
  entry: RegistryProgramEntry,
  definition: ToolDefinition
): string[] {
  const candidates = new Set<string>();

  if (entry.displayIcon) {
    const iconPath = parseExecutableFromCommand(entry.displayIcon);
    if (iconPath) {
      candidates.add(iconPath);
    }
  }

  if (entry.uninstallString) {
    const uninstallPath = parseExecutableFromCommand(entry.uninstallString);
    if (uninstallPath) {
      const uninstallName = path.basename(uninstallPath).toLowerCase();
      if (definition.executableNames.some((name) => name.toLowerCase() === uninstallName)) {
        candidates.add(uninstallPath);
      }
    }
  }

  if (entry.installLocation) {
    for (const executableName of definition.executableNames) {
      candidates.add(path.join(entry.installLocation, executableName));
    }
  }

  return [...candidates];
}

export function findRegistryInstallPaths(definition: ToolDefinition): string[] {
  const matchingEntries = listRegistryPrograms().filter((entry) =>
    matchesDisplayName(definition, entry.displayName)
  );

  return matchingEntries.flatMap((entry) => buildRegistryCandidates(entry, definition));
}
