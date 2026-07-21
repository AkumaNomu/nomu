"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { tracks } from "@/lib/tracks";
import { useAudio } from "./AudioProvider";
import styles from "./MusicPlayer.module.css";

/** Compatibility cue for older page placements. Playback lives in persistent site widget. */
export function MusicPlayer({ compact = false }: { compact?: boolean }) {
  const audio = useAudio();
  const track = tracks[audio.current];

  return (
    <button className={`${styles.inlineCue} ${compact ? styles.compactCue : ""}`} type="button" onClick={audio.openWidget}>
      <Image src={track.artwork} width={56} height={56} alt="" />
      <span><small>Now playing</small><strong>{track.title}</strong><em>{track.artist}</em></span>
      <b aria-hidden="true">Open <ArrowUpRight size={11} /></b>
    </button>
  );
}
