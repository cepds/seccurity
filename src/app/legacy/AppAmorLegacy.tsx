import { useEffect, useState } from "react";
import { appContent, sanitizeMemoryEntries, type MemoryEntry } from "../../data/content";
import { useAudio } from "../../hooks/useAudio";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { AudioPlayer } from "../../components/AudioPlayer/AudioPlayer";
import { Modal } from "../../components/Modal/Modal";
import { Opening } from "../../sections/Opening/Opening";
import { QuizGate } from "../../sections/QuizGate/QuizGate";
import { LoveLetter } from "../../sections/LoveLetter/LoveLetter";
import { Gallery } from "../../sections/Gallery/Gallery";
import { Timeline } from "../../sections/Timeline/Timeline";
import { Memories } from "../../sections/Memories/Memories";
import { Promises } from "../../sections/Promises/Promises";
import { Finale } from "../../sections/Finale/Finale";
import { appChapters, type ChapterId } from "../routes";
import { storageKeys } from "../../services/storage";
import {
  observeElements,
  registerServiceWorker,
  scrollToElement,
} from "../../services/device";
import styles from "./AppAmorLegacy.module.css";

export default function AppAmorLegacy() {
  const audio = useAudio();
  const [quizUnlocked, setQuizUnlocked] = useLocalStorage(storageKeys.quizUnlocked, false);
  const [memories, setMemories] = useLocalStorage<MemoryEntry[]>(
    storageKeys.memories,
    appContent.fallbackMemories,
    (value) => sanitizeMemoryEntries(value, appContent.fallbackMemories)
  );
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [activeChapter, setActiveChapter] = useState<ChapterId>("opening");

  useEffect(() => {
    void registerServiceWorker();
  }, []);

  useEffect(() => {
    return observeElements(
      "[data-chapter]",
      (element) => {
        const chapterId = element.getAttribute("data-chapter") as ChapterId | null;
        if (chapterId) {
          setActiveChapter(chapterId);
        }
      },
      {
        threshold: 0.45,
        rootMargin: "-10% 0px -20% 0px",
      }
    );
  }, []);

  function scrollToChapter(id: ChapterId) {
    scrollToElement(id);
  }

  function handleUnlock() {
    setQuizUnlocked(true);
    setSurpriseOpen(true);
    window.setTimeout(() => scrollToChapter("opening"), 180);
  }

  return (
    <div className={`${styles.appShell} ${!quizUnlocked ? styles.isLocked : ""}`}>
      <div className={styles.ambient} aria-hidden="true" />

      <QuizGate quiz={appContent.quiz} unlocked={quizUnlocked} onUnlock={handleUnlock} />

      <div className={styles.contentLayer}>
        <nav className={styles.chapterRail} aria-label="Capitulos do app">
          <div className={styles.chapterRailInner}>
            {appChapters.map((chapter) => (
              <button
                key={chapter.id}
                type="button"
                className={`${styles.chapterButton} ${
                  activeChapter === chapter.id ? styles.chapterButtonActive : ""
                }`}
                onClick={() => scrollToChapter(chapter.id)}
              >
                {chapter.label}
              </button>
            ))}
          </div>
        </nav>

        <main className={styles.sectionStack}>
          <Opening
            id="opening"
            content={appContent.hero}
            metadata={appContent.metadata}
            onOpenSurprise={() => setSurpriseOpen(true)}
            onToggleAudio={audio.toggle}
            isAudioPlaying={audio.isPlaying}
          />

          <LoveLetter
            id="love-letter"
            letters={appContent.letters}
            spotlightMessages={appContent.spotlightMessages}
            reasons={appContent.reasons}
            highlights={appContent.highlights}
          />

          <Gallery id="gallery" items={appContent.gallery} />
          <Timeline id="timeline" items={appContent.timeline} />
          <Memories id="memories" memories={memories} onChange={setMemories} />
          <Promises id="promises" items={appContent.promises} />

          <Finale
            id="finale"
            vow={appContent.finalVow}
            onOpenSurprise={() => setSurpriseOpen(true)}
          />
        </main>

        <p className={styles.footerNote}>
          APP AMOR em nova stack premium: React, TypeScript, Framer Motion e pipeline Capacitor
          preservado.
        </p>
      </div>

      <AudioPlayer isPlaying={audio.isPlaying} status={audio.status} onToggle={audio.toggle} />

      <Modal
        open={surpriseOpen}
        title={appContent.surprise.title}
        onClose={() => setSurpriseOpen(false)}
      >
        <p>{appContent.surprise.body}</p>
        <p>{appContent.surprise.signature}</p>
      </Modal>
    </div>
  );
}
