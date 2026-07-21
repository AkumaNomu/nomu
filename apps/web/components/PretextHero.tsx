"use client";

import { useEffect, useRef, useState } from "react";
import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import styles from "./PretextHero.module.css";

export function PretextHero({ children }: { children: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [lines, setLines] = useState<string[] | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !window.Intl.Segmenter) return;
    const measure = () => {
      const computed = getComputedStyle(element);
      const width = element.clientWidth;
      const font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
      const prepared = prepareWithSegments(children, font, { letterSpacing: Number.parseFloat(computed.letterSpacing) || 0 });
      setLines(layoutWithLines(prepared, width, Number.parseFloat(computed.lineHeight)).lines.map((line) => line.text));
    };
    void document.fonts.ready.then(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children]);

  return <h1 ref={ref} className={styles.heading} data-pretext>{lines ? lines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>) : children}</h1>;
}
