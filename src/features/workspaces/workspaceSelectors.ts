import type {
  WorkspaceAppAssignment,
  WorkspaceDefinition,
  WorkspaceWindowSlot,
} from "../../../shared/types";

export const workspaceWindowSlotOptions: Array<{
  value: WorkspaceWindowSlot;
  label: string;
}> = [
  { value: "manual", label: "Manual" },
  { value: "left", label: "Esquerda" },
  { value: "right", label: "Direita" },
  { value: "top", label: "Topo" },
  { value: "bottom", label: "Base" },
  { value: "center", label: "Centro" },
];

export function sortWorkspaceAssignments(assignments: WorkspaceAppAssignment[]): WorkspaceAppAssignment[] {
  return [...assignments].sort((left, right) => {
    if (left.launchOrder !== right.launchOrder) {
      return left.launchOrder - right.launchOrder;
    }

    return left.toolId.localeCompare(right.toolId);
  });
}

export function countEnabledAssignments(workspace: WorkspaceDefinition): number {
  return workspace.assignments.filter((assignment) => assignment.enabled).length;
}

export function countConfiguredSlots(workspace: WorkspaceDefinition): number {
  return workspace.assignments.filter((assignment) => assignment.windowSlot !== "manual").length;
}
