import { motion } from "framer-motion";
import { PremiumButton } from "../PremiumButton/PremiumButton";
import styles from "./Hero.module.css";

type HeroProps = {
  eyebrow: string;
  title: string;
  headline: string;
  description: string;
  image: string;
  portrait: string;
  primaryCta: string;
  secondaryCta: string;
  detail: string;
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
};

export function Hero({
  eyebrow,
  title,
  headline,
  description,
  image,
  portrait,
  primaryCta,
  secondaryCta,
  detail,
  onPrimaryClick,
  onSecondaryClick,
}: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.backdrop}>
        <img
          src={image}
          alt="Carlos e Sandra em um retrato de abertura"
          className={styles.backdropImage}
          loading="eager"
          fetchPriority="high"
        />
        <div className={styles.overlay} aria-hidden="true" />
      </div>

      <div className={styles.grid}>
        <motion.div
          className={styles.copyBlock}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.headline}>{headline}</p>
          <p className={styles.description}>{description}</p>
          <div className={styles.actions}>
            <PremiumButton onClick={onPrimaryClick}>{primaryCta}</PremiumButton>
            <PremiumButton variant="ghost" onClick={onSecondaryClick}>
              {secondaryCta}
            </PremiumButton>
          </div>
          <p className={styles.detail}>{detail}</p>
        </motion.div>

        <motion.figure
          className={styles.portraitWrap}
          initial={{ opacity: 0, scale: 0.96, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.12, ease: "easeOut" }}
        >
          <img src={portrait} alt="Retrato vertical de Carlos e Sandra" className={styles.portrait} />
        </motion.figure>
      </div>
    </section>
  );
}
