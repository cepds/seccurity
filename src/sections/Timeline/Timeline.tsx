import { SectionHeader } from "../../components/SectionHeader/SectionHeader";
import { TimelineItem } from "../../components/TimelineItem/TimelineItem";
import type { TimelineEntry } from "../../data/content";
import styles from "./Timeline.module.css";

type TimelineProps = {
  id: string;
  items: TimelineEntry[];
};

export function Timeline({ id, items }: TimelineProps) {
  return (
    <section id={id} data-chapter={id} className={`section-anchor section-surface ${styles.section}`}>
      <SectionHeader
        eyebrow="Linha do tempo"
        title="Nossa historia em quatro cenas grandes"
        copy="Cada data entra com espaco, imagem e texto curto. A timeline nao precisa provar tudo. Ela so precisa fazer sentir de novo."
      />

      <div className={styles.list}>
        {items.map((item) => (
          <TimelineItem key={`${item.date}-${item.title}`} item={item} />
        ))}
      </div>
    </section>
  );
}
