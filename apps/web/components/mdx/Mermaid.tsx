"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./Mermaid.module.css";

let initialized = false;

// Renders a mermaid diagram client-side. The mermaid definition arrives as a
// string prop (a ```mermaid fenced block is transformed into <Mermaid chart="">
// by the remark-obsidian plugin, so shiki never touches it).
export function Mermaid({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const { default: mermaid } = await import("mermaid");
      if (!initialized) {
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict" });
        initialized = true;
      }
      try {
        const { svg } = await mermaid.render(`mermaid-${reactId}`, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : "Failed to render diagram");
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <figure className={styles.mermaid}>
        <pre className={styles.error}>{error}</pre>
      </figure>
    );
  }

  return <figure className={styles.mermaid} ref={containerRef} aria-label="Diagram" />;
}
