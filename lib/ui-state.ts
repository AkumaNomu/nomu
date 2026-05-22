"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  COMMENTS_COLLAPSED_STORAGE_KEY,
  MUSIC_COLLAPSED_STORAGE_KEY,
  READING_MODE_STORAGE_KEY
} from "@/lib/ui-state-keys";

export {
  READING_MODE_STORAGE_KEY,
  MUSIC_COLLAPSED_STORAGE_KEY,
  COMMENTS_COLLAPSED_STORAGE_KEY
};

const CHANGE_EVENT = "nomu:ui-state";

type Listener = () => void;

function emit(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
}

function subscribe(key: string, listener: Listener) {
  function handler(event: Event) {
    const detail = (event as CustomEvent<{ key: string }>).detail;
    if (!detail || detail.key === key) listener();
  }
  function storage(event: StorageEvent) {
    if (event.key === key) listener();
  }
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", storage);
  };
}

function readBoolean(key: string, defaultValue: boolean) {
  if (typeof window === "undefined") return defaultValue;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return defaultValue;
  return raw === "1" || raw === "true";
}

function writeBoolean(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value ? "1" : "0");
  emit(key);
}

export function usePersistedBoolean(key: string, defaultValue = false) {
  const value = useSyncExternalStore(
    useCallback((listener: Listener) => subscribe(key, listener), [key]),
    useCallback(() => readBoolean(key, defaultValue), [key, defaultValue]),
    useCallback(() => defaultValue, [defaultValue])
  );

  const setValue = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      const current = readBoolean(key, defaultValue);
      const resolved = typeof next === "function" ? (next as (c: boolean) => boolean)(current) : next;
      writeBoolean(key, resolved);
      if (key === READING_MODE_STORAGE_KEY && typeof document !== "undefined") {
        document.documentElement.dataset.readingMode = resolved ? "on" : "off";
      }
    },
    [key, defaultValue]
  );

  return [value, setValue] as const;
}

export function useReadingMode() {
  return usePersistedBoolean(READING_MODE_STORAGE_KEY, false);
}

export function useMusicCollapsed() {
  return usePersistedBoolean(MUSIC_COLLAPSED_STORAGE_KEY, false);
}

export function useCommentsCollapsed() {
  return usePersistedBoolean(COMMENTS_COLLAPSED_STORAGE_KEY, true);
}
