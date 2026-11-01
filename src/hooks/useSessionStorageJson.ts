'use client';

import { useMemo, useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function readItem(key: string): string {
  try {
    return window.sessionStorage.getItem(key) ?? '';
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
    return '';
  }
}

/**
 * A JSON value an earlier page left in sessionStorage (for example the unit
 * chosen on an "add" page). `isHydrated` is false during server rendering,
 * where storage doesn't exist; `value` is null when nothing usable is stored.
 */
export function useSessionStorageJson<T>(key: string): {
  value: T | null;
  isHydrated: boolean;
} {
  const raw = useSyncExternalStore(
    subscribe,
    () => readItem(key),
    () => null,
  );

  const value = useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [raw]);

  return { value, isHydrated: raw !== null };
}
