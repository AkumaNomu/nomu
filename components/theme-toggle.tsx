"use client";

import { useSyncExternalStore } from "react";
import { SymbolIcon } from "@/components/icons";
import { THEME_STORAGE_KEY, type ThemeMode } from "@/lib/theme";

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function subscribeToTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getSnapshot(): ThemeMode {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribeToTheme, getSnapshot, getServerSnapshot);

  function toggleTheme() {
    const nextTheme: ThemeMode = mode === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }

  const isDark = mode === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className="icon-button icon-button-ghost"
    >
      <SymbolIcon name={isDark ? "light_mode" : "dark_mode"} className="icon-button-glyph" />
    </button>
  );
}
