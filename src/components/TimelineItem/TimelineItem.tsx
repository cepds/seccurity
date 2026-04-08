import { motion } from "framer-motion";
import type { TimelineEntry } from "../../data/content";
import styles from "./TimelineItem.module.css";

type TimelineItemProps = {
  item: TimelineEntry;
};

export function TimelineItem({ item }: TimelineItemProps) {
  return (
    <motion.article
      className={styles.item}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.28 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className={styles.rail}>
        <span className={styles.dot} aria-hidden="true" />
      </div>
      <div className={styles.content}>
        <p className={styles.date}>{item.date}</p>
        <h3 className={styles.title}>{item.title}</h3>
        <p className={styles.copy}>{item.copy}</p>
      </div>
      <div className={styles.mediaWrap}>
        <img src={item.image} alt={item.alt} className={styles.media} loading="lazy" />
      </div>
    </motion.article>
  );
}
