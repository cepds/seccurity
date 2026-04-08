import { motion } from "framer-motion";
import { PremiumButton } from "../../components/PremiumButton/PremiumButton";
import { SectionHeader } from "../../components/SectionHeader/SectionHeader";
import styles from "./Finale.module.css";

type FinaleProps = {
  id: string;
  vow: string;
  onOpenSurprise: () => void;
};

export function Finale({ id, vow, onOpenSurprise }: FinaleProps) {
  return (
    <section id={id} data-chapter={id} className={`section-anchor ${styles.section}`}>
      <div className={styles.backdrop}>
        <img
          src="/assets/highlights/embrace.webp"
          alt="Carlos e Sandra em um abraco"
          className={styles.image}
          loading="lazy"
        />
        <div className={styles.overlay} aria-hidden="true" />
      </div>

      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <SectionHeader
          eyebrow="Finale"
          title="Com amor, Carlos."
          copy="Um fecho para terminar o app com a mesma calma bonita de um ultimo frame."
        />
        <p className={styles.vow}>{vow}</p>
        <PremiumButton onClick={onOpenSurprise}>Abrir dedicacao final</PremiumButton>
      </motion.div>
    </section>
  );
}
