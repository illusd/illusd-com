import { useEffect, useRef } from "react";

/**
 * Persist any serializable form state to localStorage so it survives
 * tab visibility changes, window minimization, navigation, and HMR.
 *
 * Usage:
 *   const [title, setTitle] = useState("");
 *   useDraftPersist("new-article:title", title, setTitle);
 *   // when done:
 *   clearDraft("new-article:title")
 */
export function useDraftPersist<T>(
  key: string,
  value: T,
  setValue: (v: T) => void,
  enabled: boolean = true,
) {
  const loaded = useRef(false);

  // Restore once on mount
  useEffect(() => {
    if (!enabled || loaded.current) return;
    loaded.current = true;
    try {
      const raw = localStorage.getItem(`draft:${key}`);
      if (raw != null) {
        const parsed = JSON.parse(raw);
        if (parsed !== null && parsed !== undefined) setValue(parsed as T);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  // Save (debounced) when value changes
  useEffect(() => {
    if (!enabled || !loaded.current) return;
    const id = setTimeout(() => {
      try {
        if (value === "" || value == null) {
          localStorage.removeItem(`draft:${key}`);
        } else {
          localStorage.setItem(`draft:${key}`, JSON.stringify(value));
        }
      } catch {
        // quota or private mode — ignore
      }
    }, 400);
    return () => clearTimeout(id);
  }, [key, value, enabled]);
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(`draft:${key}`);
  } catch {
    // ignore
  }
}
