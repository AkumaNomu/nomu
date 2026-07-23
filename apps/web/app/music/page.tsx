import type { Metadata } from "next";
import { commentsDb } from "@/lib/db";
import { MusicCard, type LibraryTrack } from "@/components/music/MusicCard";
import styles from "./musicLibrary.module.css";

export const metadata: Metadata = {
  title: "Music",
  description: "Songs I like — lyrics, chords, and notes. Pick one to play here on the site.",
  alternates: { canonical: "/music" },
};

export const dynamic = "force-dynamic";

async function getTracks(): Promise<LibraryTrack[]> {
  if (!commentsDb) return [];
  return await commentsDb`
    SELECT id, title, artist, album, artwork_path, slug
    FROM public.music
    ORDER BY created_at DESC
  ` as LibraryTrack[];
}

export default async function MusicPage() {
  const tracks = await getTracks();

  return (
    <div className="site-shell">
      <div className={styles.page}>
        <h1 className={styles.heading}>Music</h1>
        <p className={styles.intro}>Songs I like. Pick one to hear it here on the site — lyrics and chords live on each track&apos;s page.</p>
        {tracks.length ? (
          <div className={styles.grid}>
            {tracks.map((track) => <MusicCard key={track.id} track={track} />)}
          </div>
        ) : <p className={styles.empty}>No tracks in the library yet.</p>}
      </div>
    </div>
  );
}
