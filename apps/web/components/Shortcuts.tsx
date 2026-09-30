"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAudio } from "@/components/music/AudioProvider";
import styles from "./Shortcuts.module.css";

const rows: Array<{ keys: string[]; action: string }> = [
  { keys: ["/"], action: "Focus blog search" },
  { keys: ["T"], action: "Toggle light / dark theme" },
  { keys: ["M"], action: "Mute / unmute music" },
  { keys: ["K"], action: "Play / pause music" },
  { keys: ["?"], action: "Show this dialog" },
  { keys: ["Esc"], action: "Close dialogs" },
];

function isEditable(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element || typeof element.tagName !== "string") return false;
  return element.isContentEditable || element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT";
}

export function openShortcuts() {
  window.dispatchEvent(new CustomEvent("site:open-shortcuts"));
}

export function KeyboardShortcuts() {
  const { playPause, toggleMute } = useAudio();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("site:open-shortcuts", onOpen);
    return () => window.removeEventListener("site:open-shortcuts", onOpen);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Escape") { setOpen(false); return; }
      if (isEditable(event.target)) return;
      switch (event.key) {
        case "?": event.preventDefault(); setOpen(true); break;
        case "/": {
          const search = document.getElementById("blog-search");
          if (search) { event.preventDefault(); search.focus(); }
          break;
        }
        case "t": case "T": window.dispatchEvent(new CustomEvent("site:toggle-theme")); break;
        case "m": case "M": toggleMute(); break;
        case "k": case "K": playPause(); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playPause, toggleMute]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className={styles.panel} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <div className={styles.header}>
          <strong>Keyboard shortcuts</strong>
          <button className={styles.close} type="button" aria-label="Close shortcuts" onClick={() => setOpen(false)}>
            <X aria-hidden="true" />
          </button>
        </div>
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.action}>
              <span className={styles.keys}>{row.keys.map((key) => <kbd key={key}>{key}</kbd>)}</span>
              <span className={styles.action}>{row.action}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
