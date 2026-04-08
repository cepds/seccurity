import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { QuizQuestion } from "../../data/content";
import { PremiumButton } from "../../components/PremiumButton/PremiumButton";
import styles from "./QuizGate.module.css";

type QuizGateProps = {
  quiz: QuizQuestion[];
  unlocked: boolean;
  onUnlock: () => void;
};

export function QuizGate({ quiz, unlocked, onUnlock }: QuizGateProps) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const question = quiz[index];
  const progress = useMemo(() => `${index + 1} / ${quiz.length}`, [index, quiz.length]);

  function handleAnswer(option: string) {
    if (option !== question.answer) {
      setFeedback("Quase. Tenta de novo porque essa memoria merece o detalhe certo.");
      return;
    }

    setFeedback("");

    if (index === quiz.length - 1) {
      onUnlock();
      return;
    }

    setIndex((value) => value + 1);
  }

  return (
    <AnimatePresence>
      {!unlocked ? (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            className={styles.panel}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <p className={styles.eyebrow}>Ritual de entrada</p>
            <h2 className={styles.title}>APP AMOR</h2>
            <p className={styles.copy}>
              Três respostas certas e a experiencia abre como um presente em capitulos.
            </p>

            <div className={styles.questionBlock}>
              <div className={styles.progressRow}>
                <span>{progress}</span>
                <span>Somente para Sandra</span>
              </div>
              <p className={styles.question}>{question.question}</p>
              <div className={styles.options}>
                {question.options.map((option) => (
                  <PremiumButton
                    key={option}
                    variant="ghost"
                    fullWidth
                    onClick={() => handleAnswer(option)}
                  >
                    {option}
                  </PremiumButton>
                ))}
              </div>
            </div>

            <p className={styles.feedback} aria-live="polite">
              {feedback || "Tudo aqui foi pensado para tocar devagar e forte ao mesmo tempo."}
            </p>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
