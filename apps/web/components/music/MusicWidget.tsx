"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Music2, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PauseIcon, PlayIcon, SkipIcon } from "@personal/design-system";
import { sound } from "@/lib/audio/soundEngine";
import type { Track } from "@/lib/tracks";
import styles from "./MusicPlayer.module.css";

type PlayerState = "icon" | "floating" | "expanded";

const FLOATING_HIDE_DELAY = 15000;
const WAVE_BAR_HEIGHTS = ["0.4rem", "0.85rem", "0.6rem", "1rem", "0.5rem"];

export type MusicWidgetProps = {
  currentTrack: Track;
  duration: number;
  playing: boolean;
  time: number;
  volume: number;
  next: () => void;
  playPause: () => void;
  previous: () => void;
  seek: (value: number) => void;
  setVolume: (value: number) => void;
};

export function MusicWidget({ currentTrack, playing, volume, next, playPause, previous, setVolume }: MusicWidgetProps) {
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState<PlayerState>("icon");
  const hideTimer = useRef<number | null>(null);

  const clearHideTimer = () => {
    if (hideTimer.current === null) return;
    window.clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };
  const scheduleHide = () => {
    clearHideTimer();
    hideTimer.current = window.setTimeout(() => setState("icon"), FLOATING_HIDE_DELAY);
  };

  useEffect(() => () => clearHideTimer(), []);

  const enter = reducedMotion ? { duration: 0 } : { duration: 0.26, ease: [0.16, 1, 0.3, 1] as const };
  const exit = reducedMotion ? { duration: 0 } : { duration: 0.16, ease: [0.4, 0, 1, 1] as const };

  // A single AnimatePresence around the three mutually-exclusive layouts so the
  // outgoing pill actually plays its exit animation instead of vanishing the
  // instant React swaps it out for another one.
  return (
    // No mode="wait": the incoming pill crossfades in immediately alongside the
    // outgoing one's exit, so switching states feels instant, not delayed.
    <AnimatePresence initial={false}>
      {state === "icon" ? (
        <motion.aside
          key="icon"
          className={`${styles.widget} ${styles.mini}`}
          aria-label="Site music player"
          data-state="icon"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, scale: 0.9, y: 10, transition: exit }}
          transition={enter}
          onPointerEnter={() => { clearHideTimer(); setState("floating"); }}
        >
          <div className={styles.miniPill}>
            <button
              className={styles.miniOpen}
              type="button"
              aria-controls="site-music-panel"
              aria-expanded="false"
              aria-label={`Open music player: ${currentTrack.title} by ${currentTrack.artist}`}
              title="Open music player"
              onClick={() => { sound.play("open"); clearHideTimer(); setState("expanded"); }}
            >
              <Music2 aria-hidden="true" />
            </button>
          </div>
        </motion.aside>
      ) : state === "floating" ? (
        <motion.aside
          key="floating"
          className={`${styles.widget} ${styles.mini}`}
          aria-label="Site music player"
          data-state="floating"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, scale: 0.94, y: 6, transition: exit }}
          transition={enter}
          onPointerEnter={clearHideTimer}
          onPointerLeave={scheduleHide}
        >
          <button
            className={styles.floatingPill}
            type="button"
            aria-controls="site-music-panel"
            aria-expanded="false"
            aria-label={`Open music player: ${currentTrack.title} by ${currentTrack.artist}`}
            title="Open music player"
            onClick={() => { sound.play("open"); clearHideTimer(); setState("expanded"); }}
          >
            <span className={styles.miniArt}>
              <Image src={currentTrack.artwork} width={48} height={48} alt="" />
            </span>
            <span className={styles.floatingTitle}>{currentTrack.title}</span>
            <span className={`${styles.wave} ${playing ? styles.wavePlaying : ""}`}>
              <span className={styles.waveRow}>
                {WAVE_BAR_HEIGHTS.map((height, index) => (
                  <i key={index} style={{ "--h": height, "--i": index } as CSSProperties} />
                ))}
              </span>
            </span>
          </button>
        </motion.aside>
      ) : (
        <motion.aside
          key="expanded"
          className={`${styles.widget} ${styles.expanded}`}
          aria-label="Site music player"
          data-state="expanded"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: 10, transition: exit }}
          transition={enter}
        >
          <div className={styles.expandedPill} id="site-music-panel">
            <button className={styles.exArt} type="button" onClick={playPause} aria-label={playing ? "Pause" : "Play"} aria-pressed={playing} title={playing ? "Pause" : "Play"}>
              <Image src={currentTrack.artwork} width={60} height={60} priority alt={`${currentTrack.album} album cover`} />
              <span className={styles.exArtOverlay} aria-hidden="true">{playing ? <PauseIcon /> : <PlayIcon />}</span>
            </button>

            <div className={styles.exCopy} aria-live="polite">
              <strong>{currentTrack.title}</strong>
              <span>{currentTrack.artist}</span>
            </div>

            <div className={styles.exControls}>
              <button type="button" onClick={previous} aria-label="Previous track" title="Previous track">
                <SkipIcon style={{ transform: "scaleX(-1)" }} />
              </button>
              <button className={styles.exPlay} type="button" onClick={playPause} aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause" : "Play"} aria-pressed={playing}>
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button type="button" onClick={next} aria-label="Next track" title="Next track">
                <SkipIcon />
              </button>
            </div>

            <label className={styles.exVolume}>
              {volume === 0 ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
              <span className={styles.srOnly}>Volume</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                style={{ "--progress": `${volume * 100}%` } as CSSProperties}
                onChange={(event) => setVolume(Number(event.target.value))}
              />
            </label>

            <button className={styles.exCollapse} type="button" onClick={() => { sound.play("close"); setState("icon"); }} aria-label="Collapse music player" title="Collapse music player">
              <ChevronDown aria-hidden="true" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
