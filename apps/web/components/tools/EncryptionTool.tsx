"use client";

import { useState } from "react";
import styles from "./tools.module.css";

type Mode = "encrypt" | "decrypt" | "hash" | "base64";

function toBase64(bytes: Uint8Array) {
  let output = "";
  for (const byte of bytes) output += String.fromCharCode(byte);
  return btoa(output);
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array) {
  return Uint8Array.from(bytes).buffer as ArrayBuffer;
}

async function keyFromPassword(password: string, salt: Uint8Array) {
  const passwordKey = await crypto.subtle.importKey("raw", toArrayBuffer(new TextEncoder().encode(password)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toArrayBuffer(salt), iterations: 250_000, hash: "SHA-256" },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function EncryptionTool() {
  const [mode, setMode] = useState<Mode>("encrypt");
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setError("");
    setOutput("");
    if (!input) return setError("Enter text first.");
    if ((mode === "encrypt" || mode === "decrypt") && !password) return setError("Enter a password first.");
    setBusy(true);

    try {
      if (mode === "hash") {
        const hash = await crypto.subtle.digest("SHA-256", toArrayBuffer(new TextEncoder().encode(input)));
        setOutput(Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join(""));
      } else if (mode === "base64") {
        setOutput(toBase64(new TextEncoder().encode(input)));
      } else if (mode === "encrypt") {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await keyFromPassword(password, salt);
        const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(new TextEncoder().encode(input)));
        setOutput(JSON.stringify({ v: 1, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(new Uint8Array(cipher)) }));
      } else {
        const payload = JSON.parse(input) as { v: number; salt: string; iv: string; data: string };
        if (payload.v !== 1 || !payload.salt || !payload.iv || !payload.data) throw new Error("Invalid encrypted payload.");
        const key = await keyFromPassword(password, fromBase64(payload.salt));
        const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toArrayBuffer(fromBase64(payload.iv)) }, key, toArrayBuffer(fromBase64(payload.data)));
        setOutput(new TextDecoder().decode(plain));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not process input.");
    } finally {
      setBusy(false);
    }
  }

  const labels: Record<Mode, string> = { encrypt: "Encrypt", decrypt: "Decrypt", hash: "Hash", base64: "Base64 encode" };
  const needsPassword = mode === "encrypt" || mode === "decrypt";
  return (
    <div className={styles.stack}>
      <div className={styles.tabs} role="tablist" aria-label="Encryption modes">
        {(Object.keys(labels) as Mode[]).map((item) => <button aria-selected={mode === item} className={mode === item ? styles.tabActive : styles.tab} key={item} onClick={() => setMode(item)} role="tab" type="button">{labels[item]}</button>)}
      </div>
      <div className={styles.field}>
        <label htmlFor="encryption-input">{mode === "decrypt" ? "Encrypted payload" : "Input"}</label>
        <textarea className={styles.textarea} id="encryption-input" onChange={(event) => setInput(event.target.value)} value={input} />
      </div>
      {needsPassword && <div className={styles.field}>
        <label htmlFor="encryption-password">Password</label>
        <input className={styles.input} id="encryption-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
      </div>}
      <div className={styles.actions}>
        <button className={styles.button} disabled={busy} onClick={run} type="button">{busy ? "Working..." : labels[mode]}</button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {output && <div className={styles.field}>
        <label htmlFor="encryption-output">Output</label>
        <textarea className={styles.textarea} id="encryption-output" readOnly value={output} />
      </div>}
      <p className={styles.hint}>AES-256-GCM uses a fresh salt and IV each time. All work stays in browser.</p>
    </div>
  );
}
