"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, FolderKanban, Gamepad2, Library, Moon, Music, Newspaper, Settings, User, Volume2, VolumeX, Wrench, X } from "lucide-react";
import { useSound } from "@/components/audio/SoundProvider";
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
  { href: "/blog", label: "Blog", icon: Newspaper },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/music", label: "Music", icon: Music },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/resources", label: "Resources", icon: Library },
  { href: "/about", label: "About", icon: User }
] as const;

function applyPreferences(preferences: Preferences) {
  const root = document.documentElement;
  root.dataset.theme = preferences.theme;
  root.dataset.accent = preferences.accent;
  root.dataset.fontSize = preferences.fontSize;
}

function AppearanceSettings() {
  const [preferences, setPreferences] = useState(defaults);
  const { volume, muted, setMuted, setVolume } = useSound();
  const [open, setOpen] = useState(false);

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

  const close = () => { sound.play("close"); setOpen(false); };

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        className={styles.settingsTrigger}
        type="button"
        aria-label="Site settings"
        title="Site settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { sound.play("open"); setOpen(true); }}
      >
        <Settings aria-hidden="true" />
      </button>

      {open ? (
        <div className={styles.settingsBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section className={styles.settingsPanel} role="dialog" aria-modal="true" aria-label="Site settings">
            <div className={styles.settingsPanelHeader}>
              <strong>Settings</strong>
              <button className={styles.settingsClose} type="button" aria-label="Close settings" onClick={close}>
                <X aria-hidden="true" />
              </button>
            </div>

            <div className={styles.settingsGroup}>
              <div className={styles.settingsTitle}><strong>Appearance</strong></div>
              <button className={styles.themeToggle} type="button" aria-pressed={preferences.theme === "dark"} onClick={() => update({ theme: preferences.theme === "dark" ? "light" : "dark" })}>
                <span className={styles.themeIcon}><Moon aria-hidden="true" /></span>
                <span className={styles.themeLabel}>Dark theme</span>
                <span className={styles.themeSwitch} aria-hidden="true"><span>{preferences.theme === "dark" ? <Check /> : null}</span></span>
              </button>
            </div>

            <fieldset className={styles.settingsFieldset}>
              <legend>Accent color</legend>
              <div className={styles.swatches}>
                {accents.map((accent) => <button key={accent} type="button" data-color={accent} aria-label={accent} title={accent} aria-pressed={preferences.accent === accent} onClick={() => update({ accent })} />)}
              </div>
            </fieldset>
            <fieldset className={styles.settingsFieldset}>
              <legend>Font size</legend>
              <div className={styles.fontSizes}>
                {fontSizes.map((fontSize) => <button key={fontSize} type="button" aria-pressed={preferences.fontSize === fontSize} onClick={() => update({ fontSize })}>{fontSize[0].toUpperCase() + fontSize.slice(1)}</button>)}
              </div>
            </fieldset>
            <fieldset className={styles.settingsFieldset}>
              <legend>Sound effects</legend>
              <div className={styles.soundControl}>
                <button type="button" aria-label={muted ? "Unmute sound effects" : "Mute sound effects"} title={muted ? "Unmute sound effects" : "Mute sound effects"} onClick={() => setMuted(!muted)}>{muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}</button>
                <input aria-label="Sound effects volume" type="range" min="0" max="3" step="0.05" value={muted ? 0 : volume} onChange={(event) => { setMuted(false); setVolume(Number(event.target.value)); }} />
                <output>{Math.round((muted ? 0 : volume) * 100)}%</output>
              </div>
            </fieldset>
          </section>
        </div>
      ) : null}
    </>
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
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href as Route} className={active ? styles.active : undefined} aria-current={active ? "page" : undefined} aria-label={link.label} title={link.label} onPointerEnter={() => sound.play("hover")}>
              <Icon aria-hidden="true" />
            </Link>
          );
        })}
        <AppearanceSettings />
      </nav>
    </header>
  );
}
