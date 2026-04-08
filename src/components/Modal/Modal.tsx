import { AnimatePresence, motion } from "framer-motion";
import type { PropsWithChildren } from "react";
import { PremiumButton } from "../PremiumButton/PremiumButton";
import styles from "./Modal.module.css";

type ModalProps = PropsWithChildren<{
  open: boolean;
  title: string;
  onClose: () => void;
}>;

export function Modal({ open, title, children, onClose }: ModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.dialog}
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className={styles.glow} aria-hidden="true" />
            <h3 id="modal-title" className={styles.title}>
              {title}
            </h3>
            <div className={styles.body}>{children}</div>
            <PremiumButton onClick={onClose}>Fechar</PremiumButton>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
