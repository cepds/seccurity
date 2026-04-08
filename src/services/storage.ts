export const storageKeys = {
  memories: "nossa-historia::memories",
  quizUnlocked: "nossa-historia::quiz-unlocked",
} as const;

function hasWindow() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readStorage<T>(key: string, fallback: T, sanitize?: (value: unknown) => T): T {
  if (!hasWindow()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as unknown;
    return sanitize ? sanitize(parsed) : (parsed as T);
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures on private browsers.
  }
}
