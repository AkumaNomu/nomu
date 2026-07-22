"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus, X } from "lucide-react";
import styles from "./page.module.css";
import { ToolGlyph } from "./ToolExplorer";
import { tools } from "./tools-data";

const SLOT_COUNT = 10;
const STORAGE_KEY = "nomu-quick-access-tools";

type Slots = (string | null)[];

function emptySlots(): Slots {
  return Array.from({ length: SLOT_COUNT }, () => null);
}

function QuickAddSlot({ index, onPick }: { index: number; onPick: (slug: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const listLabel = `Add a tool to quick access slot ${index + 1}`;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.quickSlot} ref={ref}>
      <button
        type="button"
        className={styles.quickEmpty}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={listLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.quickPlus} aria-hidden="true"><Plus size={22} strokeWidth={1.6} /></span>
        <span className={styles.quickAddLabel}>Add tool</span>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            role="listbox"
            aria-label={listLabel}
            className={styles.quickOptions}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: reducedMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "top" }}
          >
            {tools.map((tool) => (
              <button
                key={tool.slug}
                type="button"
                role="option"
                onClick={() => { onPick(tool.slug); setOpen(false); }}
              >
                {tool.name}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function QuickAccessGrid() {
  const [slots, setSlots] = useState<Slots>(emptySlots);
  const [hydrated, setHydrated] = useState(false);
  const toolBySlug = useMemo(() => new Map(tools.map((tool) => [tool.slug as string, tool] as const)), []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setSlots(Array.from({ length: SLOT_COUNT }, (_, index) => {
            const value = parsed[index];
            return typeof value === "string" ? value : null;
          }));
        }
      }
    } catch {
      // Ignore malformed or unavailable storage; fall back to empty slots.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    } catch {
      // Storage may be unavailable (private mode); ignore write failures.
    }
  }, [slots, hydrated]);

  function assign(index: number, slug: string | null) {
    setSlots((current) => current.map((value, position) => (position === index ? slug : value)));
  }

  return (
    <section className={styles.quickAccess} aria-labelledby="quick-access-title">
      <h2 className={styles.sectionLabel} id="quick-access-title">Quick access</h2>
      <div className={styles.quickGrid}>
        {slots.map((slug, index) => {
          const tool = slug ? toolBySlug.get(slug) : undefined;

          if (tool) {
            return (
              <div className={styles.quickSlot} key={index}>
                <Link className={styles.quickCard} href={`/tools/${tool.slug}` as Route} aria-label={`Open ${tool.name}`}>
                  <ToolGlyph kind={tool.icon} />
                </Link>
                <button
                  type="button"
                  className={styles.quickRemove}
                  onClick={() => assign(index, null)}
                  aria-label={`Remove ${tool.name} from quick access`}
                >
                  <X aria-hidden="true" size={13} strokeWidth={1.8} />
                </button>
              </div>
            );
          }

          return <QuickAddSlot index={index} key={index} onPick={(nextSlug) => assign(index, nextSlug)} />;
        })}
      </div>
    </section>
  );
}
