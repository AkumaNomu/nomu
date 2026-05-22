"use client";

import { useEffect, useState } from "react";
import { SymbolIcon } from "@/components/icons";
import { useReadingMode } from "@/lib/ui-state";

export function ReadingModeToggle({ variant = "nav" }: { variant?: "nav" | "floating" }) {
  const [active, setActive] = useReadingMode();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const label = active ? "Exit reading mode" : "Enter reading mode";

  if (variant === "floating") {
    return (
      <button
        type="button"
        onClick={() => setActive((current) => !current)}
        className="reading-mode-floating"
        aria-label={label}
        aria-pressed={active}
        title={label}
      >
        <SymbolIcon name={active ? "close" : "reading"} className="icon-button-glyph" />
        <span className="reading-mode-floating-label">{active ? "Exit reading" : "Reading"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActive((current) => !current)}
      className={`icon-button ${active ? "icon-button-primary" : "icon-button-ghost"}`}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      <SymbolIcon name={active ? "close" : "reading"} className="icon-button-glyph" />
    </button>
  );
}
