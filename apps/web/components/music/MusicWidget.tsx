"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useState } from "react";
import { ChevronDown, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PauseIcon, PlayIcon, SkipIcon } from "@personal/design-system";
import { sound } from "@/lib/audio/soundEngine";
import type { Track } from "@/lib/tracks";
import styles from "./MusicPlayer.module.css";

type PlayerState = "mini" | "expanded";

// Static waveform silhouette (percent heights) reused by the mini progress bars.
const WAVE = [42, 68, 100, 58, 84, 46, 92, 54, 76, 38, 88, 50, 96, 62, 44, 70];

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

export function MusicWidget({ currentTrack, duration, playing, time, volume, next, playPause, previous, setVolume }: MusicWidgetProps) {
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState<PlayerState>("mini");
  const progress = duration ? `${(Math.min(time, duration) / duration) * 100}%` : "0%";

  const enter = reducedMotion ? { duration: 0 } : { duration: 0.26, ease: [0.16, 1, 0.3, 1] as const };
  const exit = reducedMotion ? { duration: 0 } : { duration: 0.16, ease: [0.4, 0, 1, 1] as const };

  // A single AnimatePresence around the two mutually-exclusive layouts so the
  // outgoing pill actually plays its exit animation instead of vanishing the
  // instant React swaps it out for the other one.
  return (
    // No mode="wait": the incoming pill crossfades in immediately alongside the
    // outgoing one's exit, so switching states feels instant, not delayed.
    <AnimatePresence initial={false}>
      {state === "mini" ? (
        <motion.aside
          key="mini"
          className={`${styles.widget} ${styles.mini}`}
          aria-label="Site music player"
          data-state="mini"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, scale: 0.9, y: 10, transition: exit }}
          transition={enter}
        >
          <div className={styles.miniPill}>
            <button
              className={styles.miniOpen}
              type="button"
              aria-controls="site-music-panel"
              aria-expanded="false"
              aria-label={`Expand music player: ${currentTrack.title} by ${currentTrack.artist}`}
              onClick={() => { sound.play("open"); setState("expanded"); }}
            >
              <span className={styles.miniArt}>
                <Image src={currentTrack.artwork} width={48} height={48} alt={`${currentTrack.album} album cover`} />
              </span>
              <span className={`${styles.wave} ${playing ? styles.wavePlaying : ""}`} aria-hidden="true">
                <span className={styles.waveRow}>
                  {WAVE.map((h, i) => <i key={i} style={{ "--h": `${h}%`, "--i": i } as CSSProperties} />)}
                </span>
                <span className={styles.waveFill} style={{ width: progress }}>
                  <span className={styles.waveRow}>
                    {WAVE.map((h, i) => <i key={i} style={{ "--h": `${h}%`, "--i": i } as CSSProperties} />)}
                  </span>
                </span>
              </span>
            </button>
            <button
              className={styles.miniPlay}
              type="button"
              onClick={playPause}
              aria-label={playing ? "Pause" : "Play"}
              aria-pressed={playing}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>
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
            <span className={styles.exArt}>
              <Image src={currentTrack.artwork} width={60} height={60} priority alt={`${currentTrack.album} album cover`} />
            </span>

            <div className={styles.exCopy} aria-live="polite">
              <strong>{currentTrack.title}</strong>
              <span>{currentTrack.artist}</span>
            </div>

            <div className={styles.exControls}>
              <button type="button" onClick={previous} aria-label="Previous track">
                <SkipIcon style={{ transform: "scaleX(-1)" }} />
              </button>
              <button className={styles.exPlay} type="button" onClick={playPause} aria-label={playing ? "Pause" : "Play"} aria-pressed={playing}>
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button type="button" onClick={next} aria-label="Next track">
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

            <button className={styles.exCollapse} type="button" onClick={() => { sound.play("close"); setState("mini"); }} aria-label="Collapse music player">
              <ChevronDown aria-hidden="true" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
