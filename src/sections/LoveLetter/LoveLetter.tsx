import { motion } from "framer-motion";
import { GalleryHighlight } from "../../components/GalleryHighlight/GalleryHighlight";
import { SectionHeader } from "../../components/SectionHeader/SectionHeader";
import type { GalleryEntry } from "../../data/content";
import styles from "./LoveLetter.module.css";

type LoveLetterProps = {
  id: string;
  letters: string[];
  spotlightMessages: string[];
  reasons: string[];
  highlights: Array<Pick<GalleryEntry, "title" | "copy" | "image" | "alt">>;
};

export function LoveLetter({
  id,
  letters,
  spotlightMessages,
  reasons,
  highlights,
}: LoveLetterProps) {
  return (
    <section id={id} data-chapter={id} className={`section-anchor section-surface ${styles.section}`}>
      <SectionHeader
        eyebrow="Carta principal"
        title="Menos blocos. Mais presenca."
        copy="Este capitulo respira. Ele deixa o texto entrar como voz baixa e a imagem ficar com a parte mais forte da cena."
      />

      <div className={styles.layout}>
        <div className={styles.letterColumn}>
          {letters.map((letter, index) => (
            <motion.p
              key={letter}
              className={styles.letter}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
            >
              {letter}
            </motion.p>
          ))}

          <div className={styles.reasonGrid}>
            {reasons.map((reason) => (
              <span key={reason} className={styles.reason}>
                {reason}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.mediaColumn}>
          <GalleryHighlight
            item={{ ...highlights[1], badge: "Spotlight" }}
            large
            eager
          />
          <div className={styles.spotlightList}>
            {spotlightMessages.map((message, index) => (
              <motion.p
                key={message}
                className={styles.spotlightMessage}
                initial={{ opacity: 0, x: 18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, delay: index * 0.04, ease: "easeOut" }}
              >
                {message}
              </motion.p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
