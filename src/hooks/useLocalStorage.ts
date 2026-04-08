import { useEffect, useState } from "react";
import { readStorage, writeStorage } from "../services/storage";

export function useLocalStorage<T>(
  key: string,
  fallback: T,
  sanitize?: (value: unknown) => T
) {
  const [value, setValue] = useState<T>(() => readStorage(key, fallback, sanitize));

  useEffect(() => {
    writeStorage(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
