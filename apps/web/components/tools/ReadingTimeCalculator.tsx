"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import styles from "./tools.module.css";

const number = new Intl.NumberFormat("en");

export function ReadingTimeCalculator() {
  const reduceMotion = useReducedMotion();
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(225);
  const metrics = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const totalSeconds = Math.ceil((words / speed) * 60);
    return { words, totalSeconds, characters: text.length };
  }, [speed, text]);
  const minutes = Math.floor(metrics.totalSeconds / 60);
  const seconds = metrics.totalSeconds % 60;

  return (
    <div className={styles.stack}>
      <div className={styles.field}>
        <label htmlFor="article-text">Article text</label>
        <textarea className={styles.textarea} id="article-text" onChange={(event) => setText(event.currentTarget.value)} placeholder="Paste an article, note, or draft…" value={text} />
        <p className={styles.hint}>Punctuation and paragraph breaks do not inflate the word count.</p>
      </div>
      <div className={styles.field}>
        <label htmlFor="reading-speed">Reading speed · {speed} words per minute</label>
        <input id="reading-speed" max={500} min={100} onChange={(event) => setSpeed(Number(event.currentTarget.value))} step={5} type="range" value={speed} />
      </div>
      <motion.div animate={{ opacity: 1 }} className={styles.result} initial={reduceMotion ? false : { opacity: 0.7 }} key={`${minutes}-${seconds}`} aria-live="polite">
        <p className={styles.resultLabel}>Estimated reading time</p>
        <p className={styles.resultValue}>{minutes > 0 ? `${minutes}m ` : ""}{seconds}s</p>
      </motion.div>
      <dl className={styles.stats}>
        <div className={styles.stat}><dt>Words</dt><dd>{number.format(metrics.words)}</dd></div>
        <div className={styles.stat}><dt>Characters</dt><dd>{number.format(metrics.characters)}</dd></div>
        <div className={styles.stat}><dt>Words / minute</dt><dd>{speed}</dd></div>
      </dl>
    </div>
  );
}
