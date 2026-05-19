"use client";

import { useState } from "react";
import { SymbolIcon } from "@/components/icons";
import { THEME_STORAGE_KEY, type ThemeMode } from "@/lib/theme";

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function readTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";
  const current = document.documentElement.dataset.theme;
  return current === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme());

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={theme === "dark"}
      className="flex items-center gap-2 rounded-full border-[0.5px] border-border-subtle px-3 py-2 text-ink-muted transition-colors hover:border-primary hover:text-primary focus-ring"
      onClick={toggleTheme}
    >
      <SymbolIcon name={theme === "dark" ? "light_mode" : "dark_mode"} className="text-[18px]" />
      <span className="font-label-caps text-label-caps hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
