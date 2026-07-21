"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { contrastRatio, normalizeHex, relativeLuminance } from "./color";
import styles from "./tools.module.css";

type PaletteColor = { id: number; value: string };

export function PaletteRatioChecker() {
  const reduceMotion = useReducedMotion();
  const nextId = useRef(4);
  const [colors, setColors] = useState<PaletteColor[]>([
    { id: 1, value: "#090909" },
    { id: 2, value: "#F5F3EE" },
    { id: 3, value: "#77736D" },
  ]);
  const pairs = useMemo(() => colors.flatMap((first, firstIndex) => colors.slice(firstIndex + 1).map((second) => ({
    first, second, ratio: contrastRatio(first.value, second.value),
  }))), [colors]);

  const update = (id: number, value: string) => setColors((current) => current.map((color) => color.id === id ? { ...color, value } : color));
  const add = () => setColors((current) => current.length >= 6 ? current : [...current, { id: nextId.current++, value: "#B8B4AC" }]);
  const remove = (id: number) => setColors((current) => current.length <= 2 ? current : current.filter((color) => color.id !== id));

  const luminances = colors.map((color) => relativeLuminance(color.value)).filter((value): value is number => value !== null);
  const spread = luminances.length ? Math.max(...luminances) - Math.min(...luminances) : 0;

  return (
    <div className={styles.stack}>
      <div className={styles.paletteList}>
        <AnimatePresence initial={false}>
          {colors.map((color, index) => {
            const normalized = normalizeHex(color.value);
            return (
              <motion.div className={styles.paletteRow} key={color.id} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}>
                <input aria-label={`Color ${index + 1} picker`} className={styles.colorInput} onChange={(event) => update(color.id, event.currentTarget.value.toUpperCase())} type="color" value={normalized ?? "#000000"} />
                <div className={styles.field}>
                  <label htmlFor={`palette-${color.id}`}>Color {index + 1}</label>
                  <input aria-invalid={!normalized} className={styles.input} id={`palette-${color.id}`} onChange={(event) => update(color.id, event.currentTarget.value)} value={color.value} />
                </div>
                <button aria-label={`Remove color ${index + 1}`} className={styles.copy} disabled={colors.length <= 2} onClick={() => remove(color.id)} type="button">Remove</button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className={styles.actions}>
        <button className={styles.button} disabled={colors.length >= 6} onClick={add} type="button">Add color</button>
      </div>
      <div className={styles.result} aria-live="polite">
        <p className={styles.resultLabel}>Luminance spread</p>
        <p className={styles.resultValue}>{Math.round(spread * 100)}%</p>
        <p className={styles.hint}>Higher spread usually gives a palette more usable contrast range.</p>
      </div>
      <div className={styles.field}>
        <h2 className={styles.legend}>Pair contrast</h2>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.ratioTable}>
            <thead><tr><th>Pair</th><th>Ratio</th><th>Normal text</th><th>Large text</th></tr></thead>
            <tbody>
              {pairs.map(({ first, second, ratio }) => (
                <tr key={`${first.id}-${second.id}`}>
                  <td>{first.value} / {second.value}</td>
                  <td>{ratio === null ? "Invalid" : `${ratio.toFixed(2)}:1`}</td>
                  <td>{ratio !== null && ratio >= 4.5 ? "Pass" : "Fail"}</td>
                  <td>{ratio !== null && ratio >= 3 ? "Pass" : "Fail"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
