import { useMemo, useState, type FormEvent } from "react";
import { toolCatalog } from "../../../shared/toolCatalog";
import { formatAbsoluteTimestamp } from "../../lib/format";
import type { WorkspaceAppAssignment, WorkspaceDefinition } from "../../../shared/types";
import {
  countConfiguredSlots,
  countEnabledAssignments,
  sortWorkspaceAssignments,
  workspaceWindowSlotOptions,
} from "./workspaceSelectors";
import styles from "./WorkspacesTab.module.css";

interface WorkspacesTabProps {
  workspaces: WorkspaceDefinition[];
  onCreateWorkspace: (name: string) => Promise<void>;
  onRenameWorkspace: (workspaceId: string, name: string) => Promise<void>;
  onUpdateWorkspaceAssignment: (
    workspaceId: string,
    assignment: WorkspaceAppAssignment
  ) => Promise<void>;
  onLaunchWorkspace: (workspaceId: string) => Promise<void>;
  isCreatingWorkspace: boolean;
  updatingWorkspaceId: string | null;
  updatingWorkspaceAssignmentKey: string | null;
  launchingWorkspaceId: string | null;
}

export function WorkspacesTab({
  workspaces,
  onCreateWorkspace,
  onRenameWorkspace,
  onUpdateWorkspaceAssignment,
  onLaunchWorkspace,
  isCreatingWorkspace,
  updatingWorkspaceId,
  updatingWorkspaceAssignmentKey,
  launchingWorkspaceId,
}: WorkspacesTabProps) {
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [assignmentDrafts, setAssignmentDrafts] = useState<
    Record<string, { enabled: boolean; launchOrder: string; windowSlot: WorkspaceAppAssignment["windowSlot"] }>
  >({});
  const toolNameMap = useMemo(
    () => new Map(toolCatalog.map((tool) => [tool.id, tool.name])),
    []
  );

  function getAssignmentKey(workspaceId: string, toolId: string): string {
    return `${workspaceId}:${toolId}`;
  }

  function getAssignmentDraft(
    workspaceId: string,
    assignment: WorkspaceAppAssignment
  ): { enabled: boolean; launchOrder: string; windowSlot: WorkspaceAppAssignment["windowSlot"] } {
    const assignmentKey = getAssignmentKey(workspaceId, assignment.toolId);
    return (
      assignmentDrafts[assignmentKey] ?? {
        enabled: assignment.enabled,
        launchOrder: String(assignment.launchOrder),
        windowSlot: assignment.windowSlot,
      }
    );
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = newWorkspaceName.trim();
    if (!normalizedName) {
      return;
    }

    await onCreateWorkspace(normalizedName);
    setNewWorkspaceName("");
  }

  return (
    <section className={styles.workspacesTab}>
      <header className={styles.header}>
        <div>
          <p className={styles.sectionLabel}>Workspaces</p>
          <h2 className={styles.sectionTitle}>Agrupe e organize seus contextos de trabalho</h2>
        </div>
      </header>

      <section className={styles.createPanel}>
        <div>
          <p className={styles.sectionLabel}>Criar</p>
          <h3 className={styles.sectionTitle}>Novo workspace</h3>
        </div>

        <form className={styles.createForm} onSubmit={handleCreateSubmit}>
          <input
            className={styles.input}
            type="text"
            value={newWorkspaceName}
            onChange={(event) => setNewWorkspaceName(event.target.value)}
            placeholder="Ex.: Resposta a Incidentes"
          />
          <button type="submit" className={styles.button} disabled={isCreatingWorkspace}>
            {isCreatingWorkspace ? "Criando..." : "Criar workspace"}
          </button>
        </form>
      </section>

      {workspaces.length === 0 ? (
        <div className={styles.emptyState}>Nenhum workspace encontrado.</div>
      ) : (
        workspaces.map((workspace) => {
          const enabledCount = countEnabledAssignments(workspace);
          const configuredSlotCount = countConfiguredSlots(workspace);
          const draftName = draftNames[workspace.id] ?? workspace.name;
          const sortedAssignments = sortWorkspaceAssignments(workspace.assignments);

          return (
            <article key={workspace.id} className={styles.workspaceCard}>
              <form
                className={styles.editRow}
                onSubmit={async (event) => {
                  event.preventDefault();
                  await onRenameWorkspace(workspace.id, draftName);
                }}
              >
                <input
                  className={styles.input}
                  type="text"
                  value={draftName}
                  onChange={(event) =>
                    setDraftNames((current) => ({
                      ...current,
                      [workspace.id]: event.target.value,
                    }))
                  }
                />
                <button
                  type="submit"
                  className={styles.button}
                  disabled={
                    updatingWorkspaceId === workspace.id ||
                    !draftName.trim() ||
                    draftName.trim() === workspace.name
                  }
                >
                  {updatingWorkspaceId === workspace.id ? "Salvando..." : "Salvar nome"}
                </button>
              </form>

              <p className={styles.description}>{workspace.description}</p>

              <div className={styles.workspaceMeta}>
                <span className={styles.metaPill}>{workspace.assignments.length} apps associados</span>
                <span className={styles.metaPill}>{enabledCount} habilitados</span>
                <span className={styles.metaPill}>{configuredSlotCount} slots definidos</span>
              </div>

              <div className={styles.workspaceActions}>
                <button
                  type="button"
                  className={styles.button}
                  disabled={launchingWorkspaceId === workspace.id}
                  onClick={() => {
                    void onLaunchWorkspace(workspace.id);
                  }}
                >
                  {launchingWorkspaceId === workspace.id ? "Executando..." : "Executar workspace"}
                </button>
              </div>

              <section className={styles.assignmentSection}>
                <div className={styles.assignmentHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Layout</p>
                    <h3 className={styles.assignmentTitle}>Apps vinculados ao workspace</h3>
                  </div>
                  <span className={styles.assignmentHint}>
                    Ajuste abertura, ordem e slot antes de executar.
                  </span>
                </div>

                <div className={styles.assignmentList}>
                  {sortedAssignments.map((assignment) => {
                    const draft = getAssignmentDraft(workspace.id, assignment);
                    const assignmentKey = getAssignmentKey(workspace.id, assignment.toolId);
                    const parsedLaunchOrder = Number.parseInt(draft.launchOrder, 10);
                    const normalizedLaunchOrder = Number.isNaN(parsedLaunchOrder)
                      ? assignment.launchOrder
                      : parsedLaunchOrder;
                    const isChanged =
                      draft.enabled !== assignment.enabled ||
                      normalizedLaunchOrder !== assignment.launchOrder ||
                      draft.windowSlot !== assignment.windowSlot;

                    return (
                      <article key={assignment.toolId} className={styles.assignmentCard}>
                        <div className={styles.assignmentIdentity}>
                          <strong>{toolNameMap.get(assignment.toolId) ?? assignment.toolId}</strong>
                          <span className={styles.assignmentId}>{assignment.toolId}</span>
                        </div>

                        <label className={styles.checkboxField}>
                          <input
                            type="checkbox"
                            checked={draft.enabled}
                            onChange={(event) =>
                              setAssignmentDrafts((current) => ({
                                ...current,
                                [assignmentKey]: {
                                  ...draft,
                                  enabled: event.target.checked,
                                },
                              }))
                            }
                          />
                          <span>Habilitar no workspace</span>
                        </label>

                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>Launch order</span>
                          <input
                            className={styles.assignmentInput}
                            type="number"
                            min={0}
                            step={1}
                            value={draft.launchOrder}
                            onChange={(event) =>
                              setAssignmentDrafts((current) => ({
                                ...current,
                                [assignmentKey]: {
                                  ...draft,
                                  launchOrder: event.target.value,
                                },
                              }))
                            }
                          />
                        </label>

                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>Window slot</span>
                          <select
                            className={styles.assignmentSelect}
                            value={draft.windowSlot}
                            onChange={(event) =>
                              setAssignmentDrafts((current) => ({
                                ...current,
                                [assignmentKey]: {
                                  ...draft,
                                  windowSlot: event.target.value as WorkspaceAppAssignment["windowSlot"],
                                },
                              }))
                            }
                          >
                            {workspaceWindowSlotOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <button
                          type="button"
                          className={styles.button}
                          disabled={updatingWorkspaceAssignmentKey === assignmentKey || !isChanged}
                          onClick={() => {
                            void onUpdateWorkspaceAssignment(workspace.id, {
                              ...assignment,
                              enabled: draft.enabled,
                              launchOrder: normalizedLaunchOrder,
                              windowSlot: draft.windowSlot,
                            });
                          }}
                        >
                          {updatingWorkspaceAssignmentKey === assignmentKey
                            ? "Salvando..."
                            : "Salvar app"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>

              <span className={styles.timestamp}>
                Atualizado em {formatAbsoluteTimestamp(workspace.updatedAt)}
              </span>
            </article>
          );
        })
      )}
    </section>
  );
}
