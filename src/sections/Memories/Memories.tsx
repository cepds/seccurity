import { startTransition, type FormEvent, useMemo, useState } from "react";
import { MemoryCard } from "../../components/MemoryCard/MemoryCard";
import { PremiumButton } from "../../components/PremiumButton/PremiumButton";
import { SectionHeader } from "../../components/SectionHeader/SectionHeader";
import {
  createMemoryDraft,
  type MemoryDraft,
  type MemoryEntry,
  hasRequiredMemoryFields,
  memoryImageOptions,
  memoryMoodOptions,
  sanitizeMemoryEntry,
  sanitizeMemoryEntries,
  safeText,
  truncateText,
} from "../../data/content";
import styles from "./Memories.module.css";

type MemoriesProps = {
  id: string;
  memories: MemoryEntry[];
  onChange: (items: MemoryEntry[]) => void;
};

const emptyDraft = createMemoryDraft();

export function Memories({ id, memories, onChange }: MemoriesProps) {
  const [draft, setDraft] = useState<MemoryDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("Toda memoria nova entra com titulo, data e imagem valida.");
  const normalizedMemories = useMemo(
    () => sanitizeMemoryEntries(memories, memories),
    [memories]
  );

  function updateDraft(field: keyof MemoryDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: field === "description" ? truncateText(value, 220) : value,
    }));
  }

  function resetEditor(message: string) {
    setDraft(createMemoryDraft());
    setEditingId(null);
    setFeedback(message);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextDraft = createMemoryDraft(draft);
    if (!hasRequiredMemoryFields(nextDraft)) {
      setFeedback("Preencha titulo, chamada, descricao e uma data valida antes de salvar.");
      return;
    }

    const nextEntry = sanitizeMemoryEntry(
      {
        id: editingId ?? undefined,
        ...nextDraft,
      },
      {
        id: editingId ?? `memory-${Date.now()}`,
        ...nextDraft,
      }
    );

    startTransition(() => {
      const nextItems = editingId
        ? normalizedMemories.map((memory) => (memory.id === editingId ? nextEntry : memory))
        : [nextEntry, ...normalizedMemories];

      onChange(sanitizeMemoryEntries(nextItems, normalizedMemories));
    });

    resetEditor(editingId ? "Memoria atualizada com cuidado." : "Memoria criada e guardada.");
  }

  function handleEdit(memory: MemoryEntry) {
    setEditingId(memory.id);
    setDraft(createMemoryDraft(memory));
    setFeedback("Modo edicao ativo. Ajuste o que quiser e salve de novo.");
  }

  function handleDelete(idToDelete: string) {
    startTransition(() => {
      const nextItems = normalizedMemories.filter((memory) => memory.id !== idToDelete);
      onChange(sanitizeMemoryEntries(nextItems, normalizedMemories));
    });

    if (editingId === idToDelete) {
      resetEditor("Memoria removida. O formulario voltou para criar uma nova.");
      return;
    }

    setFeedback("Memoria removida do album.");
  }

  return (
    <section id={id} data-chapter={id} className={`section-anchor section-surface ${styles.section}`}>
      <SectionHeader
        eyebrow="Album vivo"
        title="Memorias com cara de objeto precioso"
        copy="Nada de formulario jogado. Aqui cada entrada nasce tratada, com imagem valida, data segura e texto curto o bastante para continuar elegante."
      />

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldBlock}>
            <label className={styles.label} htmlFor="memory-title">
              Titulo
            </label>
            <input
              id="memory-title"
              className={styles.input}
              value={draft.title}
              maxLength={68}
              onChange={(event) => updateDraft("title", safeText(event.target.value))}
              placeholder="Ex.: O jantar em que tudo ficou mais leve"
            />
          </div>

          <div className={styles.row}>
            <div className={styles.fieldBlock}>
              <label className={styles.label} htmlFor="memory-date">
                Data
              </label>
              <input
                id="memory-date"
                className={styles.input}
                type="date"
                value={draft.date}
                onChange={(event) => updateDraft("date", event.target.value)}
              />
            </div>

            <div className={styles.fieldBlock}>
              <label className={styles.label} htmlFor="memory-mood">
                Clima
              </label>
              <select
                id="memory-mood"
                className={styles.input}
                value={draft.mood}
                onChange={(event) => updateDraft("mood", event.target.value)}
              >
                {memoryMoodOptions.map((mood) => (
                  <option key={mood} value={mood}>
                    {mood}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.fieldBlock}>
            <label className={styles.label} htmlFor="memory-headline">
              Chamada curta
            </label>
            <input
              id="memory-headline"
              className={styles.input}
              value={draft.headline}
              maxLength={72}
              onChange={(event) => updateDraft("headline", safeText(event.target.value))}
              placeholder="Uma linha curta que carrega o frame"
            />
          </div>

          <div className={styles.fieldBlock}>
            <label className={styles.label} htmlFor="memory-description">
              Descricao
            </label>
            <textarea
              id="memory-description"
              className={`${styles.input} ${styles.textarea}`}
              value={draft.description}
              rows={5}
              onChange={(event) => updateDraft("description", event.target.value)}
              placeholder="Escreva a memoria em poucas linhas, sem perder o sentimento."
            />
            <span className={styles.hint}>{draft.description.length} / 220</span>
          </div>

          <div className={styles.fieldBlock}>
            <label className={styles.label} htmlFor="memory-image">
              Imagem
            </label>
            <select
              id="memory-image"
              className={styles.input}
              value={draft.image}
              onChange={(event) => updateDraft("image", event.target.value)}
            >
              {memoryImageOptions.map((option) => (
                <option key={option.image} value={option.image}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.preview}>
            <img src={draft.image} alt="Previa da memoria selecionada" className={styles.previewImage} />
            <div className={styles.previewCopy}>
              <strong>{draft.title || "Seu titulo aparece aqui"}</strong>
              <span>{draft.headline || "Uma chamada elegante ajuda a memoria a respirar."}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <PremiumButton type="submit">{editingId ? "Atualizar memoria" : "Salvar memoria"}</PremiumButton>
            <PremiumButton variant="ghost" onClick={() => resetEditor("Editor limpo para uma nova memoria.")}>
              Limpar
            </PremiumButton>
          </div>

          <p className={styles.feedback} aria-live="polite">
            {feedback}
          </p>
        </form>

        <div className={styles.cards}>
          {normalizedMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
