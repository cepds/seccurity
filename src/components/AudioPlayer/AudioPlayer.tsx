import { motion } from "framer-motion";
import { PremiumButton } from "../PremiumButton/PremiumButton";
import styles from "./AudioPlayer.module.css";

type AudioPlayerProps = {
  isPlaying: boolean;
  status: string;
  onToggle: () => void | Promise<void>;
};

export function AudioPlayer({ isPlaying, status, onToggle }: AudioPlayerProps) {
  return (
    <motion.aside
      className={styles.player}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.45, ease: "easeOut" }}
    >
      <div className={styles.labelBlock}>
        <p className={styles.kicker}>Trilha do momento</p>
        <p className={styles.status}>{status}</p>
      </div>
      <PremiumButton variant={isPlaying ? "ghost" : "primary"} onClick={onToggle}>
        {isPlaying ? "Pausar trilha" : "Tocar trilha"}
      </PremiumButton>
    </motion.aside>
  );
}
