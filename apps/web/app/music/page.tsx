import type { Metadata } from "next";
import { commentsDb } from "@/lib/db";
import { mergeLibraryTracks, type MusicRow } from "@/lib/musicLibrary";
import { TrackCollection } from "@/components/music/TrackCollection";
import styles from "./musicLibrary.module.css";

export const metadata: Metadata = {
  title: "Music",
  description: "Songs I like — lyrics, chords, and notes. Pick one to play here on the site.",
  alternates: { canonical: "/music" },
};

export const dynamic = "force-dynamic";

async function getRows(): Promise<MusicRow[]> {
  if (!commentsDb) return [];
  return await commentsDb`
    SELECT id, title, artist, album, file_path, artwork_path, duration_ms, slug
    FROM public.music
    ORDER BY created_at DESC
  ` as MusicRow[];
}

export default async function MusicPage() {
  const tracks = mergeLibraryTracks(await getRows());

  return (
    <div className="site-shell">
      <div className={styles.page}>
        <h1 className={styles.srOnly}>Music</h1>
        {tracks.length ? <TrackCollection tracks={tracks} /> : <p className={styles.empty}>No tracks in the library yet.</p>}
      </div>
    </div>
  );
}
