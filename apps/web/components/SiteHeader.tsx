"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccountPanel } from "@/components/account/AccountPanel";
import { sound } from "@/lib/audio/soundEngine";
import styles from "./SiteHeader.module.css";

type Preferences = {
  theme: "light" | "dark";
  accent: "green" | "blue" | "rust" | "gold";
  fontSize: "small" | "medium" | "large";
};

const STORAGE_KEY = "nomu-appearance";
const defaults: Preferences = { theme: "light", accent: "green", fontSize: "medium" };
const accents = ["green", "blue", "rust", "gold"] as const;
const fontSizes = ["small", "medium", "large"] as const;

const links = [
  { href: "/blog", label: "Blog" },
  { href: "/projects", label: "Projects" },
  { href: "/tools", label: "Tools" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" }
] as const;

function applyPreferences(preferences: Preferences) {
  const root = document.documentElement;
  root.dataset.theme = preferences.theme;
  root.dataset.accent = preferences.accent;
  root.dataset.fontSize = preferences.fontSize;
}

function AppearanceSettings() {
  const [preferences, setPreferences] = useState(defaults);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Preferences>;
        const next: Preferences = {
          theme: saved.theme === "dark" ? "dark" : "light",
          accent: accents.includes(saved.accent as Preferences["accent"]) ? saved.accent as Preferences["accent"] : defaults.accent,
          fontSize: fontSizes.includes(saved.fontSize as Preferences["fontSize"]) ? saved.fontSize as Preferences["fontSize"] : defaults.fontSize
        };
        setPreferences(next);
        applyPreferences(next);
      } catch {
        applyPreferences(defaults);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const update = (patch: Partial<Preferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    applyPreferences(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <details className={styles.settings}>
      <summary aria-label="Site settings" title="Site settings">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="4"/></svg>
      </summary>
      <section className={styles.settingsPanel} aria-label="Site settings">
        <div className={styles.settingsTitle}><strong>Account</strong><span>Sign in to comment and react to posts</span></div>
        <AccountPanel />

        <div className={styles.settingsDivider} />

        <div className={styles.settingsTitle}><strong>Appearance</strong><span>Saved on this device</span></div>
        <label className={styles.toggle}>
          <span>Dark theme</span>
          <input type="checkbox" checked={preferences.theme === "dark"} onChange={(event) => update({ theme: event.target.checked ? "dark" : "light" })} />
        </label>
        <fieldset>
          <legend>Accent color</legend>
          <div className={styles.swatches}>
            {accents.map((accent) => <button key={accent} type="button" data-color={accent} aria-label={accent} aria-pressed={preferences.accent === accent} onClick={() => update({ accent })} />)}
          </div>
        </fieldset>
        <fieldset>
          <legend>Font size</legend>
          <div className={styles.fontSizes}>
            {fontSizes.map((fontSize) => <button key={fontSize} type="button" aria-pressed={preferences.fontSize === fontSize} onClick={() => update({ fontSize })}>{fontSize[0].toUpperCase() + fontSize.slice(1)}</button>)}
          </div>
        </fieldset>
      </section>
    </details>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const upwardTravel = useRef(0);

  useEffect(() => {
    const resetHeader = () => {
      setHidden(false);
    };
    document.addEventListener("site:navigation-start", resetHeader);
    return () => document.removeEventListener("site:navigation-start", resetHeader);
  }, []);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const nextY = window.scrollY;
        const delta = nextY - lastY.current;

        if (nextY < 32) {
          setHidden(false);
          upwardTravel.current = 0;
        } else if (delta > 5 && nextY > 140) {
          setHidden(true);
          upwardTravel.current = 0;
        } else if (delta < 0) {
          upwardTravel.current += Math.abs(delta);
          if (upwardTravel.current > 24) setHidden(false);
        }

        lastY.current = nextY;
        frame = 0;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className={`${styles.header} ${hidden ? styles.hidden : ""}`}>
      <nav className={styles.desktop} aria-label="Primary navigation">
        {links.map((link) => {
          const active = pathname === "/" ? link.href === "/blog" : pathname.startsWith(link.href);
          return <Link key={link.href} href={link.href as Route} className={active ? styles.active : undefined} aria-current={active ? "page" : undefined} onPointerEnter={() => sound.play("hover")}>{link.label}</Link>;
        })}
        <AppearanceSettings />
      </nav>
    </header>
  );
}
