import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { commentsDb } from "@/lib/db";
import { FALLBACK_ARTWORK } from "@/lib/musicArtwork";
import { ChordSheet } from "@/components/music/ChordSheet";
import { PlayTrackButton } from "@/components/music/PlayTrackButton";
import styles from "../musicLibrary.module.css";

export const dynamic = "force-dynamic";

type TrackDetail = {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork_path?: string;
  slug: string;
  lyrics_md?: string;
  notes_md?: string;
};

async function getTrack(slug: string): Promise<TrackDetail | null> {
  if (!commentsDb) return null;
  const rows = await commentsDb`
    SELECT id, title, artist, album, artwork_path, slug, lyrics_md, notes_md
    FROM public.music
    WHERE slug = ${slug}
    LIMIT 1
  ` as TrackDetail[];
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const track = await getTrack(slug);
  if (!track) return {};
  return {
    title: track.title,
    description: `${track.artist} — lyrics, chords, and notes.`,
    alternates: { canonical: `/music/${track.slug}` },
  };
}

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const track = await getTrack(slug);
  if (!track) notFound();

  return (
    <div className="site-shell">
      <div className={styles.page}>
        <header className={styles.detailHeader}>
          <span className={styles.detailArt}>
            <Image src={track.artwork_path || FALLBACK_ARTWORK} width={140} height={140} alt="" />
          </span>
          <div className={styles.detailMeta}>
            <h1>{track.title}</h1>
            <p>{track.artist} · {track.album}</p>
            <PlayTrackButton className={styles.detailPlay} slug={track.slug} />
          </div>
        </header>

        {track.lyrics_md ? (
          <section className={styles.detailSection}>
            <h2 className={styles.sectionLabel}>Lyrics & chords</h2>
            <ChordSheet chords text={track.lyrics_md} />
          </section>
        ) : null}

        {track.notes_md ? (
          <section className={styles.detailSection}>
            <h2 className={styles.sectionLabel}>Notes</h2>
            <ChordSheet text={track.notes_md} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
