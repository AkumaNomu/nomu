"use client";

import { SymbolIcon } from "@/components/icons";
import { THEME_STORAGE_KEY, type ThemeMode } from "@/lib/theme";

function setTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function readTheme(): ThemeMode {
  const current = document.documentElement.dataset.theme;
  return current === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  function toggleTheme() {
    const nextTheme = readTheme() === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      className="flex items-center gap-2 rounded-full border-[0.5px] border-border-subtle px-3 py-2 text-ink-muted transition-colors hover:border-primary hover:text-primary focus-ring"
      onClick={toggleTheme}
    >
      <SymbolIcon name="dark_mode" className="text-[18px]" />
      <span className="font-label-caps text-label-caps hidden sm:inline">Theme</span>
    </button>
  );
}
