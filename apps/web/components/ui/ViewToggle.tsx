"use client";

import { LayoutGrid, List } from "lucide-react";
import { sound } from "@/lib/audio/soundEngine";
import styles from "./ViewToggle.module.css";

export type CollectionView = "grid" | "list";

export function ViewToggle({ view, onChange, label = "View", className }: { view: CollectionView; onChange: (view: CollectionView) => void; label?: string; className?: string }) {
  const set = (next: CollectionView) => { if (next !== view) sound.play("toggle"); onChange(next); };
  return (
    <div className={`${styles.toggle} ${className ?? ""}`} role="group" aria-label={label}>
      <button type="button" aria-label="Grid view" title="Grid view" aria-pressed={view === "grid"} onClick={() => set("grid")}>
        <LayoutGrid aria-hidden="true" />
      </button>
      <button type="button" aria-label="List view" title="List view" aria-pressed={view === "list"} onClick={() => set("list")}>
        <List aria-hidden="true" />
      </button>
    </div>
  );
}
