import { motion } from "framer-motion";
import { Hero } from "../../components/Hero/Hero";
import { buildCountdownCopy, buildTimeMessage, formatMonthSpan } from "../../services/countdown";
import styles from "./Opening.module.css";

type OpeningProps = {
  id: string;
  content: {
    eyebrow: string;
    title: string;
    headline: string;
    description: string;
    image: string;
    portrait: string;
    primaryCta: string;
    secondaryCta: string;
  };
  metadata: {
    marriageDate: string;
    targetDate: string;
  };
  onOpenSurprise: () => void;
  onToggleAudio: () => void | Promise<void>;
  isAudioPlaying: boolean;
};

export function Opening({
  id,
  content,
  metadata,
  onOpenSurprise,
  onToggleAudio,
  isAudioPlaying,
}: OpeningProps) {
  const detail = `${buildCountdownCopy(metadata.targetDate)} | ${formatMonthSpan(
    metadata.marriageDate,
    metadata.targetDate
  )} de casamento`;

  return (
    <section id={id} data-chapter={id} className={`section-anchor ${styles.section}`}>
      <Hero
        {...content}
        detail={detail}
        onPrimaryClick={onOpenSurprise}
        onSecondaryClick={onToggleAudio}
      />

      <motion.div
        className={styles.afterglow}
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <p className={styles.message}>{buildTimeMessage()}</p>
        <p className={styles.status}>
          Trilha atual: {isAudioPlaying ? "tocando em clima de filme" : "pronta para entrar em cena"}
        </p>
      </motion.div>
    </section>
  );
}
