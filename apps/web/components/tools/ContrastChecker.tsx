"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { contrastRatio, normalizeHex } from "./color";
import styles from "./tools.module.css";

export function ContrastChecker() {
  const reduceMotion = useReducedMotion();
  const [foreground, setForeground] = useState("#090909");
  const [background, setBackground] = useState("#F5F3EE");
  const normalizedForeground = normalizeHex(foreground);
  const normalizedBackground = normalizeHex(background);
  const ratio = contrastRatio(foreground, background);

  const swap = () => {
    setForeground(background);
    setBackground(foreground);
  };

  return (
    <div className={styles.stack}>
      <div className={styles.grid}>
        <ColorField id="foreground" label="Text color" value={foreground} onChange={setForeground} />
        <ColorField id="background" label="Background color" value={background} onChange={setBackground} />
      </div>
      {ratio === null || !normalizedForeground || !normalizedBackground ? (
        <p className={styles.error} role="alert">Enter a valid 3- or 6-digit hexadecimal color.</p>
      ) : (
        <>
          <motion.div
            animate={{ opacity: 1 }}
            className={styles.preview}
            initial={reduceMotion ? false : { opacity: 0.7 }}
            key={`${normalizedForeground}-${normalizedBackground}`}
            style={{ backgroundColor: normalizedBackground, color: normalizedForeground }}
          >
            Clear text respects its reader.
          </motion.div>
          <div className={styles.result} aria-live="polite">
            <p className={styles.resultLabel}>Contrast ratio</p>
            <p className={styles.resultValue}>{ratio.toFixed(2)}:1</p>
            <div className={styles.checks}>
              <Pass label="AA normal text" passes={ratio >= 4.5} />
              <Pass label="AA large text" passes={ratio >= 3} />
              <Pass label="AAA normal text" passes={ratio >= 7} />
            </div>
          </div>
        </>
      )}
      <div className={styles.actions}>
        <motion.button className={`${styles.button} ${styles.buttonSecondary}`} onClick={swap} type="button" whileTap={reduceMotion ? undefined : { scale: 0.97 }}>Swap colors</motion.button>
      </div>
    </div>
  );
}

type ColorFieldProps = { id: string; label: string; value: string; onChange: (value: string) => void };

function ColorField({ id, label, value, onChange }: ColorFieldProps) {
  const normalized = normalizeHex(value);
  return (
    <div className={styles.swatchRow}>
      <input aria-label={`${label} picker`} className={styles.colorInput} onChange={(event) => onChange(event.currentTarget.value.toUpperCase())} type="color" value={normalized ?? "#000000"} />
      <div className={styles.field}>
        <label htmlFor={id}>{label}</label>
        <input aria-invalid={!normalized} className={styles.input} id={id} onChange={(event) => onChange(event.currentTarget.value)} spellCheck={false} value={value} />
      </div>
    </div>
  );
}

function Pass({ label, passes }: { label: string; passes: boolean }) {
  return <span className={styles.check}><span aria-hidden="true" className={styles.checkMark} />{label}: {passes ? "Pass" : "Fail"}</span>;
}
