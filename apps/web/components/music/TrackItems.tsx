"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Pause, Play } from "lucide-react";
import { formatDuration, type LibraryTrack } from "@/lib/musicLibrary";
import styles from "./trackItems.module.css";

const BAR_DELAYS = ["0ms", "180ms", "360ms", "90ms"];

export function NowPlayingBars({ playing }: { playing: boolean }) {
  return (
    <span className={`${styles.bars} ${playing ? styles.barsPlaying : ""}`} aria-hidden="true">
      {BAR_DELAYS.map((delay) => <i key={delay} style={{ "--i": delay } as CSSProperties} />)}
    </span>
  );
}

export type TrackItemProps = {
  track: LibraryTrack;
  active: boolean;
  playing: boolean;
  index?: number;
  selected?: boolean;
  onSelect: (track: LibraryTrack, event: ReactMouseEvent) => void;
  onToggleSelect?: (track: LibraryTrack, event: ReactMouseEvent) => void;
};

function SelectToggle({ track, selected, onToggleSelect, className }: Pick<TrackItemProps, "track" | "selected" | "onToggleSelect"> & { className: string }) {
  if (!onToggleSelect) return null;
  return (
    <button
      className={className}
      type="button"
      role="checkbox"
      aria-checked={Boolean(selected)}
      aria-label={`${selected ? "Deselect" : "Select"} ${track.title}`}
      title={selected ? "Deselect" : "Select — shift-click to select a range"}
      onClick={(event) => onToggleSelect(track, event)}
    >
      <Check aria-hidden="true" />
    </button>
  );
}

function playLabel(track: LibraryTrack, active: boolean, playing: boolean) {
  if (active && playing) return `Pause ${track.title}`;
  return `Play ${track.title} by ${track.artist}`;
}

function openLabel(track: LibraryTrack) {
  return `Open ${track.title} by ${track.artist}`;
}

// Enter/reorder animation lives on the <li> itself rather than a wrapper: a
// wrapper would need `display: contents` to keep the grid/flex layout intact,
// and transforms don't apply to a contents-display box. No `exit` — these
// aren't direct AnimatePresence children, so an exit variant would leave
// filtered-out rows mounted forever.
function useItemMotion(index: number) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return { layout: false as const };
  return {
    layout: "position" as const,
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.24, delay: Math.min(index, 12) * 0.02, ease: [0.16, 1, 0.3, 1] as const, layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  };
}

// The card body opens the track page; playback is its own button. The link is a
// stretched overlay rather than a wrapper so the play button and the select
// checkbox can sit above it — an <a> may not contain a <button>.
export function TrackTile({ track, active, playing, index = 0, selected, onSelect, onToggleSelect }: TrackItemProps) {
  const showPause = active && playing;
  const enter = useItemMotion(index);
  return (
    <motion.li className={styles.tile} data-slug={track.slug} data-active={active} data-selected={Boolean(selected)} {...enter}>
      <span className={styles.art}>
        <Image src={track.artwork} width={320} height={320} sizes="(max-width: 767px) 45vw, 16rem" alt="" draggable={false} />
        <span className={styles.scrim} aria-hidden="true" />
        <button className={styles.tileBadge} type="button" aria-pressed={showPause} aria-label={playLabel(track, active, playing)} title={showPause ? "Pause" : "Play"} onClick={(event) => onSelect(track, event)}>
          {showPause ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
      </span>
      <span className={styles.tileMeta}>
        <strong>{track.title}</strong>
        <span>{track.artist}</span>
      </span>
      <Link className={styles.tileOpen} href={`/music/${track.slug}` as Route} draggable={false} aria-label={openLabel(track)} title="Lyrics, chords, notes" />
      <SelectToggle className={styles.tileCheck} track={track} selected={selected} onToggleSelect={onToggleSelect} />
    </motion.li>
  );
}

export function TrackRow({ track, active, playing, index = 0, selected, onSelect, onToggleSelect }: TrackItemProps) {
  const showPause = active && playing;
  const duration = formatDuration(track.durationMs);
  const enter = useItemMotion(index);
  return (
    <motion.li className={styles.row} data-slug={track.slug} data-active={active} data-selected={Boolean(selected)} {...enter}>
      <SelectToggle className={styles.rowCheck} track={track} selected={selected} onToggleSelect={onToggleSelect} />
      <button className={styles.rowPlay} type="button" aria-pressed={showPause} aria-label={playLabel(track, active, playing)} title={showPause ? "Pause" : "Play"} onClick={(event) => onSelect(track, event)}>
        <span className={styles.indexNumber}>{index + 1}</span>
        <span className={styles.indexPlay} aria-hidden="true">{showPause ? <Pause /> : <Play />}</span>
        <span className={styles.indexBars}><NowPlayingBars playing={playing} /></span>
      </button>
      <Link className={styles.rowOpen} href={`/music/${track.slug}` as Route} draggable={false} aria-label={openLabel(track)} title="Lyrics, chords, notes">
        <span className={styles.rowArt}><Image src={track.artwork} width={96} height={96} alt="" draggable={false} /></span>
        <span className={styles.rowTitle}>
          <strong>{track.title}</strong>
          <span>{track.artist}</span>
        </span>
        <span className={styles.rowAlbum}>{track.album}</span>
        <span className={styles.rowTime}>{duration}</span>
      </Link>
    </motion.li>
  );
}

export { styles as trackStyles };
