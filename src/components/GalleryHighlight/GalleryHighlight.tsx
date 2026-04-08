import { motion } from "framer-motion";
import type { GalleryEntry } from "../../data/content";
import styles from "./GalleryHighlight.module.css";

type GalleryHighlightProps = {
  item: GalleryEntry;
  large?: boolean;
  eager?: boolean;
};

export function GalleryHighlight({ item, large = false, eager = false }: GalleryHighlightProps) {
  return (
    <motion.article
      className={`${styles.card} ${large ? styles.large : ""}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className={styles.mediaWrap}>
        <img
          src={item.image}
          alt={item.alt}
          className={styles.media}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
        />
      </div>
      <div className={styles.copy}>
        <span className={styles.badge}>{item.badge}</span>
        <h3 className={styles.title}>{item.title}</h3>
        <p className={styles.text}>{item.copy}</p>
      </div>
    </motion.article>
  );
}
