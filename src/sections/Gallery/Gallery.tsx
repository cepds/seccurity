import { SectionHeader } from "../../components/SectionHeader/SectionHeader";
import { GalleryHighlight } from "../../components/GalleryHighlight/GalleryHighlight";
import type { GalleryEntry } from "../../data/content";
import styles from "./Gallery.module.css";

type GalleryProps = {
  id: string;
  items: GalleryEntry[];
};

export function Gallery({ id, items }: GalleryProps) {
  const [lead, ...rest] = items;

  return (
    <section id={id} data-chapter={id} className={`section-anchor section-surface ${styles.section}`}>
      <SectionHeader
        eyebrow="Galeria premium"
        title="Poucas imagens por vez. Muito mais impacto."
        copy="Nada de grade poluida. Aqui as fotos entram como poster, close e respiro, conduzindo o ritmo da experiencia."
      />

      <div className={styles.layout}>
        <div className={styles.lead}>
          <GalleryHighlight item={lead} large eager />
        </div>

        <div className={styles.side}>
          {rest.slice(0, 2).map((item) => (
            <GalleryHighlight key={item.image} item={item} />
          ))}
        </div>
      </div>

      <div className={styles.rail} aria-label="Outros destaques da galeria">
        {rest.slice(2).map((item) => (
          <article key={item.image} className={styles.railCard}>
            <img src={item.image} alt={item.alt} className={styles.railImage} loading="lazy" />
            <div className={styles.railCopy}>
              <span className={styles.railBadge}>{item.badge}</span>
              <h3 className={styles.railTitle}>{item.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
