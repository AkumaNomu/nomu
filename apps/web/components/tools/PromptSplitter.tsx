"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import styles from "./tools.module.css";

type SplitMode = "paragraphs" | "headings" | "length";

function chunkText(text: string, maximum: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && `${current} ${word}`.length > maximum) {
      chunks.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitPrompt(text: string, mode: SplitMode, maximum: number): string[] {
  if (!text.trim()) return [];
  if (mode === "length") return chunkText(text, maximum);
  if (mode === "paragraphs") {
    return text.trim().split(/\n\s*\n+/).flatMap((section) => chunkText(section, maximum));
  }
  const sections: string[] = [];
  let current: string[] = [];
  for (const line of text.trim().split("\n")) {
    if (/^#{1,6}\s/.test(line) && current.length) {
      sections.push(current.join("\n").trim());
      current = [];
    }
    current.push(line);
  }
  if (current.length) sections.push(current.join("\n").trim());
  return sections.flatMap((section) => chunkText(section, maximum));
}

export function PromptSplitter() {
  const reduceMotion = useReducedMotion();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<SplitMode>("paragraphs");
  const [maximum, setMaximum] = useState(800);
  const [copied, setCopied] = useState<number | "all" | null>(null);
  const sections = useMemo(() => splitPrompt(text, mode, maximum), [maximum, mode, text]);

  const copy = async (value: string, marker: number | "all") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(marker);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className={styles.stack}>
      <div className={styles.field}>
        <label htmlFor="prompt">Prompt</label>
        <textarea className={styles.textarea} id="prompt" onChange={(event) => setText(event.currentTarget.value)} placeholder="Paste a long prompt here…" value={text} />
        <p className={styles.hint}>Text stays in this browser and is never uploaded.</p>
      </div>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="split-mode">Split at</label>
          <select className={styles.select} id="split-mode" onChange={(event) => setMode(event.currentTarget.value as SplitMode)} value={mode}>
            <option value="paragraphs">Blank lines</option>
            <option value="headings">Markdown headings</option>
            <option value="length">Maximum length</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="maximum-length">Maximum characters</label>
          <input className={styles.input} id="maximum-length" max={5000} min={100} onChange={(event) => setMaximum(Math.min(5000, Math.max(100, event.currentTarget.valueAsNumber || 100)))} type="number" value={maximum} />
        </div>
      </div>

      <div className={styles.result} aria-live="polite">
        <p className={styles.resultLabel}>Sections</p>
        <p className={styles.resultValue}>{sections.length}</p>
      </div>

      {sections.length > 0 && (
        <div className={styles.actions}>
          <button className={styles.button} onClick={() => copy(sections.join("\n\n---\n\n"), "all")} type="button">{copied === "all" ? "Copied" : "Copy all"}</button>
          <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => setText("")} type="button">Clear</button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {sections.length > 0 && (
          <motion.ol className={styles.sections} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }}>
            {sections.map((section, index) => (
              <li className={styles.section} key={`${index}-${section.slice(0, 24)}`}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>Section {index + 1} · {section.length} characters</h2>
                  <button className={styles.copy} onClick={() => copy(section, index)} type="button">{copied === index ? "Copied" : "Copy"}</button>
                </div>
                <p className={styles.sectionText}>{section}</p>
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}
