"use client";

import { useState } from "react";
import styles from "./tools.module.css";

const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMBERS = "23456789";
const SYMBOLS = "!@#$%^&*-_+=";

function randomCharacter(chars: string) {
  return chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
}

function makePassword(length: number, includeSymbols: boolean) {
  const groups = [LOWER, UPPER, NUMBERS, ...(includeSymbols ? [SYMBOLS] : [])];
  const chars = groups.map(randomCharacter);
  const alphabet = groups.join("");
  while (chars.length < length) chars.push(randomCharacter(alphabet));
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = crypto.getRandomValues(new Uint32Array(1))[0] % (index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join("");
}

function scorePassword(value: string) {
  let score = 0;
  if (value.length >= 12) score += 1;
  if (value.length >= 16) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

export function PasswordUtils() {
  const [length, setLength] = useState(20);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState(() => makePassword(20, true));
  const [copied, setCopied] = useState(false);
  const score = scorePassword(password);
  const label = ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"][score];

  function generate() {
    setPassword(makePassword(length, symbols));
    setCopied(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  }

  return (
    <div className={styles.stack}>
      <div className={styles.field}>
        <label htmlFor="generated-password">Generated password</label>
        <input className={styles.input} id="generated-password" onChange={(event) => setPassword(event.target.value)} spellCheck={false} value={password} />
      </div>
      <div className={styles.result} aria-live="polite">
        <p className={styles.resultLabel}>Strength</p>
        <p className={styles.resultValue}>{label}</p>
      </div>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="password-length">Length {length}</label>
          <input className={styles.range} id="password-length" max="64" min="12" onChange={(event) => setLength(Number(event.target.value))} type="range" value={length} />
        </div>
        <label className={styles.toggle}><input checked={symbols} onChange={(event) => setSymbols(event.target.checked)} type="checkbox" /> Include symbols</label>
      </div>
      <div className={styles.actions}>
        <button className={styles.button} onClick={generate} type="button">Generate</button>
        <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={copy} type="button">{copied ? "Copied" : "Copy"}</button>
      </div>
      <p className={styles.hint}>Generated locally. No passwords leave this browser.</p>
    </div>
  );
}
