"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useState } from "react";
import { Maximize2, Minimize2, Volume2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { PauseIcon, PlayIcon, SkipIcon } from "@personal/design-system";
import type { Track } from "@/lib/tracks";
import styles from "./MusicPlayer.module.css";

function formatTime(value: number) {
  return Number.isFinite(value)
    ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`
    : "0:00";
}

type PlayerState = "compact" | "floating" | "expanded";

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

export function MusicWidget({ currentTrack, duration, playing, time, volume, next, playPause, previous, seek, setVolume }: MusicWidgetProps) {
  const reducedMotion = useReducedMotion();
  const [playerState, setPlayerState] = useState<PlayerState>("compact");
  const progress = duration ? `${(Math.min(time, duration) / duration) * 100}%` : "0%";
  const modeClass = playerState === "expanded" ? styles.expanded : playerState === "floating" ? styles.floating : styles.compact;
  const rangeStyle = { "--progress": progress } as CSSProperties;

  if (playerState === "compact") {
    return (
      <motion.aside
        className={`${styles.widget} ${modeClass}`}
        aria-label="Site music player"
        layout={!reducedMotion}
        initial={reducedMotion ? false : { opacity: 0, scale: 0.88, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { layout: { type: "spring", stiffness: 420, damping: 38 }, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          className={`${styles.compactButton} ${playing ? styles.waveformPlaying : ""}`}
          type="button"
          aria-controls="site-music-panel"
          aria-expanded="false"
          aria-label={`Open music player: ${currentTrack.title} by ${currentTrack.artist}`}
          onClick={() => setPlayerState("floating")}
        >
          <span className={styles.waveform} aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
        </button>
      </motion.aside>
    );
  }

  return (
    <motion.aside
      className={`${styles.widget} ${modeClass}`}
      aria-label="Site music player"
      data-state={playerState}
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { layout: { type: "spring", stiffness: 420, damping: 38 }, duration: 0.22 }}
    >
      <div className={styles.playerSurface} id="site-music-panel">
        <div className={styles.artwork}>
          <Image
            src={currentTrack.artwork}
            fill
            sizes="(max-width: 700px) 96px, 112px"
            priority
            alt={`${currentTrack.album} album cover`}
          />
        </div>

        <div className={styles.trackCopy} aria-live="polite">
          <strong>{currentTrack.title}</strong>
          <span>{currentTrack.artist}</span>
        </div>

        <label className={styles.timeline}>
          <span className={styles.srOnly}>Track progress</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(time, duration || 0)}
            aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
            style={rangeStyle}
            onChange={(event) => seek(Number(event.target.value))}
          />
        </label>

        <div className={styles.controlRail}>
          <button type="button" onClick={previous} aria-label="Previous track">
            <SkipIcon style={{ transform: "scaleX(-1)" }} />
          </button>
          <button className={styles.playButton} type="button" onClick={playPause} aria-label={playing ? "Pause" : "Play"} aria-pressed={playing}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button type="button" onClick={next} aria-label="Next track">
            <SkipIcon />
          </button>
          {playerState === "floating" ? (
            <>
              <button type="button" onClick={() => setPlayerState("compact")} aria-label="Collapse music player">
                <Minimize2 aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setPlayerState("expanded")} aria-label="Expand music player">
                <Maximize2 aria-hidden="true" />
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setPlayerState("floating")} aria-label="Switch to floating music player">
              <Minimize2 aria-hidden="true" />
            </button>
          )}
        </div>

        <label className={styles.volume}>
          <Volume2 aria-hidden="true" />
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
      </div>
    </motion.aside>
  );
}
