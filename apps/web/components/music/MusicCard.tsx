"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { Play } from "lucide-react";
import { sound } from "@/lib/audio/soundEngine";
import { FALLBACK_ARTWORK } from "@/lib/musicArtwork";
import { useAudio } from "./AudioProvider";
import styles from "@/app/music/musicLibrary.module.css";

export type LibraryTrack = { id: string; title: string; artist: string; album: string; artwork_path?: string; slug: string };

export function MusicCard({ track }: { track: LibraryTrack }) {
  const { playTrackBySlug } = useAudio();
  return (
    <div className={styles.card}>
      <Link className={styles.cardLink} href={`/music/${track.slug}` as Route}>
        <span className={styles.art}><Image src={track.artwork_path || FALLBACK_ARTWORK} width={160} height={160} alt="" /></span>
        <span className={styles.meta}>
          <strong>{track.title}</strong>
          <span>{track.artist}</span>
        </span>
      </Link>
      <button className={styles.play} type="button" aria-label={`Play ${track.title} on site`} onClick={() => { sound.play("tap"); playTrackBySlug(track.slug); }}>
        <Play aria-hidden="true" size={14} />
      </button>
    </div>
  );
}
