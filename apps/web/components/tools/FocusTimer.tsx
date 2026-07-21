"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import styles from "./tools.module.css";

type TimerMode = "Focus" | "Break";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function FocusTimer() {
  const reduceMotion = useReducedMotion();
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [mode, setMode] = useState<TimerMode>("Focus");
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [announcement, setAnnouncement] = useState("Timer ready.");
  const deadlineRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running || deadlineRef.current === null) return;
    const update = () => {
      if (deadlineRef.current === null) return;
      const next = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) {
        setRunning(false);
        deadlineRef.current = null;
        setAnnouncement(`${mode} session complete.`);
      }
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [mode, running]);

  const toggle = () => {
    if (running) {
      setRunning(false);
      deadlineRef.current = null;
      setAnnouncement("Timer paused.");
      return;
    }
    deadlineRef.current = Date.now() + remaining * 1000;
    setRunning(true);
    setAnnouncement(`${mode} timer started.`);
  };

  const reset = (nextMode: TimerMode = mode) => {
    const seconds = (nextMode === "Focus" ? focusMinutes : breakMinutes) * 60;
    setMode(nextMode);
    setRemaining(seconds);
    setRunning(false);
    deadlineRef.current = null;
    setAnnouncement(`${nextMode} timer reset.`);
  };

  return (
    <div className={styles.stack}>
      <div className={styles.timer}>
        <span className={styles.mode}>{mode} session</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}
            className={styles.timerValue}
            key={mode}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          >
            {formatTime(remaining)}
          </motion.p>
        </AnimatePresence>
        <div className={styles.actions}>
          <motion.button className={styles.button} onClick={toggle} type="button" whileTap={reduceMotion ? undefined : { scale: 0.97 }}>
            {running ? "Pause" : "Start"}
          </motion.button>
          <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => reset()} type="button">Reset</button>
          <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => reset(mode === "Focus" ? "Break" : "Focus")} type="button">
            Switch to {mode === "Focus" ? "break" : "focus"}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="focus-duration">Focus minutes</label>
          <input className={styles.input} id="focus-duration" max={180} min={1} onChange={(event) => {
            const value = Math.min(180, Math.max(1, event.currentTarget.valueAsNumber || 1));
            setFocusMinutes(value);
            if (mode === "Focus" && !running) setRemaining(value * 60);
          }} type="number" value={focusMinutes} />
        </div>
        <div className={styles.field}>
          <label htmlFor="break-duration">Break minutes</label>
          <input className={styles.input} id="break-duration" max={60} min={1} onChange={(event) => {
            const value = Math.min(60, Math.max(1, event.currentTarget.valueAsNumber || 1));
            setBreakMinutes(value);
            if (mode === "Break" && !running) setRemaining(value * 60);
          }} type="number" value={breakMinutes} />
        </div>
      </div>
      <p aria-live="polite" className={styles.hint}>{announcement}</p>
    </div>
  );
}
