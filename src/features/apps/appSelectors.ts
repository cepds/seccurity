import type { DetectedTool, ToolCategory, ToolPathSource } from "../../../shared/types";

export interface ToolInventorySummary {
  detectedCount: number;
  launchableCount: number;
  manualCount: number;
  missingCount: number;
}

export function buildToolInventorySummary(tools: DetectedTool[]): ToolInventorySummary {
  return {
    detectedCount: tools.filter((tool) => tool.detected).length,
    launchableCount: tools.filter((tool) => tool.launchable).length,
    manualCount: tools.filter((tool) => tool.pathSource === "manual").length,
    missingCount: tools.filter((tool) => tool.pathSource === "missing").length,
  };
}

export function filterToolsByQuery(tools: DetectedTool[], query: string): DetectedTool[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return tools;
  }

  return tools.filter((tool) =>
    [tool.name, tool.description, tool.category, tool.executableName, tool.pathSource]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export function countToolsBySource(tools: DetectedTool[], source: ToolPathSource): number {
  return tools.filter((tool) => tool.pathSource === source).length;
}

export function groupToolsByCategory(
  tools: DetectedTool[]
): Array<{ category: ToolCategory; tools: DetectedTool[] }> {
  const buckets = new Map<ToolCategory, DetectedTool[]>();

  for (const tool of tools) {
    const bucket = buckets.get(tool.category) ?? [];
    bucket.push(tool);
    buckets.set(tool.category, bucket);
  }

  return [...buckets.entries()].map(([category, categoryTools]) => ({
    category,
    tools: categoryTools.sort((left, right) => left.name.localeCompare(right.name)),
  }));
}
