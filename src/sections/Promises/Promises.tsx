import { motion } from "framer-motion";
import { SectionHeader } from "../../components/SectionHeader/SectionHeader";
import type { PromiseEntry } from "../../data/content";
import styles from "./Promises.module.css";

type PromisesProps = {
  id: string;
  items: PromiseEntry[];
};

export function Promises({ id, items }: PromisesProps) {
  return (
    <section id={id} data-chapter={id} className={`section-anchor section-surface ${styles.section}`}>
      <SectionHeader
        eyebrow="Promessas"
        title="O romance tambem mora na continuidade"
        copy="Este capitulo nao faz barulho. Ele pousa com calma e diz aquilo que ainda vamos viver juntos."
      />

      <div className={styles.grid}>
        {items.map((item, index) => (
          <motion.article
            key={item.title}
            className={styles.item}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
          >
            <span className={styles.count}>0{index + 1}</span>
            <h3 className={styles.title}>{item.title}</h3>
            <p className={styles.copy}>{item.copy}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
