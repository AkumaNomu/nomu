"use client";

import { useEffect, useState } from "react";
import styles from "./tools.module.css";

type PcInfo = { label: string; value: string };
type ExtendedNavigator = Navigator & {
  deviceMemory?: number;
  connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
};

export function PcChecker() {
  const [key, setKey] = useState("Press any key");
  const [screenInfo, setScreenInfo] = useState<PcInfo[]>([]);
  const [browserInfo, setBrowserInfo] = useState<PcInfo[]>([]);

  useEffect(() => {
    const update = () => {
      const nav = navigator as ExtendedNavigator;
      setScreenInfo([
        { label: "Viewport", value: `${window.innerWidth} x ${window.innerHeight}` },
        { label: "Screen", value: `${screen.width} x ${screen.height}` },
        { label: "Pixel ratio", value: String(window.devicePixelRatio) },
        { label: "Color depth", value: `${screen.colorDepth}-bit` },
        { label: "Touch points", value: String(navigator.maxTouchPoints) },
      ]);
      setBrowserInfo([
        { label: "CPU threads", value: String(navigator.hardwareConcurrency || "Unknown") },
        { label: "Device memory", value: nav.deviceMemory ? `${nav.deviceMemory} GB` : "Unavailable" },
        { label: "Language", value: navigator.language },
        { label: "Network", value: nav.connection?.effectiveType?.toUpperCase() ?? "Unavailable" },
        { label: "Cookies", value: navigator.cookieEnabled ? "Enabled" : "Disabled" },
      ]);
    };
    const onKeyDown = (event: KeyboardEvent) => setKey(`${event.key} | ${event.code}`);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className={styles.stack}>
      <section className={styles.checkerSection}>
        <p className={styles.resultLabel}>Keyboard check</p>
        <p className={styles.keyReadout} aria-live="polite">{key}</p>
        <p className={styles.hint}>Press keys anywhere on page. Modifier keys report too.</p>
      </section>
      <InfoGrid title="Screen" items={screenInfo} />
      <InfoGrid title="Browser and device" items={browserInfo} />
    </div>
  );
}

function InfoGrid({ title, items }: { title: string; items: PcInfo[] }) {
  return (
    <section className={styles.checkerSection}>
      <p className={styles.resultLabel}>{title}</p>
      <dl className={styles.stats}>
        {items.map((item) => <div className={styles.stat} key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
      </dl>
    </section>
  );
}
