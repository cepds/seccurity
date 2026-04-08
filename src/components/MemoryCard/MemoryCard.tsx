import { motion } from "framer-motion";
import type { MemoryEntry } from "../../data/content";
import styles from "./MemoryCard.module.css";

type MemoryCardProps = {
  memory: MemoryEntry;
  onEdit: (memory: MemoryEntry) => void;
  onDelete: (id: string) => void;
};

export function MemoryCard({ memory, onEdit, onDelete }: MemoryCardProps) {
  return (
    <motion.article
      className={styles.card}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <img src={memory.image} alt={memory.title} className={styles.image} loading="lazy" />
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.mood}>{memory.mood}</span>
          <span className={styles.date}>{memory.date}</span>
        </div>
        <h3 className={styles.title}>{memory.title}</h3>
        <p className={styles.headline}>{memory.headline}</p>
        <p className={styles.description}>{memory.description}</p>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.actionButton} onClick={() => onEdit(memory)}>
          Editar
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.deleteButton}`}
          onClick={() => onDelete(memory.id)}
        >
          Excluir
        </button>
      </div>
    </motion.article>
  );
}
