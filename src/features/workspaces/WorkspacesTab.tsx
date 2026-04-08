import { useState, type FormEvent } from "react";
import { formatAbsoluteTimestamp } from "../../lib/format";
import type { WorkspaceDefinition } from "../../../shared/types";
import styles from "./WorkspacesTab.module.css";

interface WorkspacesTabProps {
  workspaces: WorkspaceDefinition[];
  onCreateWorkspace: (name: string) => Promise<void>;
  onRenameWorkspace: (workspaceId: string, name: string) => Promise<void>;
  onLaunchWorkspace: (workspaceId: string) => Promise<void>;
  isCreatingWorkspace: boolean;
  updatingWorkspaceId: string | null;
  launchingWorkspaceId: string | null;
}

export function WorkspacesTab({
  workspaces,
  onCreateWorkspace,
  onRenameWorkspace,
  onLaunchWorkspace,
  isCreatingWorkspace,
  updatingWorkspaceId,
  launchingWorkspaceId,
}: WorkspacesTabProps) {
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});

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
          const enabledCount = workspace.assignments.filter((assignment) => assignment.enabled).length;
          const draftName = draftNames[workspace.id] ?? workspace.name;

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
