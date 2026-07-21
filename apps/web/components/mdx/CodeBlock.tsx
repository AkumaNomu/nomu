"use client";

import { useRef, useState, type ComponentPropsWithoutRef } from "react";
import styles from "./CodeBlock.module.css";

// Wraps the <pre> emitted by rehype-pretty-code and adds a copy-to-clipboard
// button. We don't fight the plugin's DOM shape: children stay untouched and we
// read the rendered text from the pre element via a ref.
export function CodeBlock({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = preRef.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) - fail silently.
    }
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.copyButton}
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre ref={preRef} {...props}>
        {children}
      </pre>
    </div>
  );
}
