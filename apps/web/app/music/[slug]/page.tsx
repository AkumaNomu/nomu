import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { commentsDb } from "@/lib/db";
import { formatDuration, mergeLibraryTracks, type LibraryTrack, type MusicRow } from "@/lib/musicLibrary";
import { getTrackNote } from "@/lib/trackNotes";
import { ChordSheet } from "@/components/music/ChordSheet";
import { PlayTrackButton } from "@/components/music/PlayTrackButton";
import { TrackCollection } from "@/components/music/TrackCollection";
import styles from "../musicLibrary.module.css";

export const dynamic = "force-dynamic";

type TrackDetail = LibraryTrack & { lyrics_md?: string; notes_md?: string };

async function getRows(): Promise<(MusicRow & { lyrics_md?: string; notes_md?: string })[]> {
  if (!commentsDb) return [];
  return await commentsDb`
    SELECT id, title, artist, album, file_path, artwork_path, duration_ms, slug, lyrics_md, notes_md
    FROM public.music
    ORDER BY created_at DESC
  ` as (MusicRow & { lyrics_md?: string; notes_md?: string })[];
}

// The library is DB rows plus file-scanned mp3s, so a slug can resolve to a
// track that has no DB row at all — merge first, then look up.
async function getLibrary(slug: string): Promise<{ track: TrackDetail | null; tracks: LibraryTrack[] }> {
  const rows = await getRows();
  const tracks = mergeLibraryTracks(rows);
  const match = tracks.find((track) => track.slug === slug);
  if (!match) return { track: null, tracks };
  const row = rows.find((item) => item.slug === slug);
  return { track: { ...match, lyrics_md: row?.lyrics_md, notes_md: row?.notes_md }, tracks };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { track } = await getLibrary(slug);
  if (!track) return {};
  return {
    title: track.title,
    description: `${track.artist} — lyrics, chords, and notes.`,
    alternates: { canonical: `/music/${track.slug}` },
  };
}

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { track, tracks } = await getLibrary(slug);
  if (!track) notFound();

  const duration = formatDuration(track.durationMs);
  const rest = tracks.filter((item) => item.slug !== track.slug);
  const note = getTrackNote(track.slug);
  const lyrics = track.lyrics_md || note.lyrics;

  return (
    <div className="site-shell">
      <div className={styles.page}>
        <p className={styles.breadcrumb}><Link href={"/music" as Route}>← Library</Link></p>
        <header className={styles.detailHeader}>
          <span className={styles.detailArt}>
            <Image src={track.artwork} width={280} height={280} priority alt={`${track.album} cover`} />
          </span>
          <div className={styles.detailMeta}>
            <h1>{track.title}</h1>
            <p>{track.artist} · {track.album}{duration ? ` · ${duration}` : ""}</p>
            <PlayTrackButton className={styles.detailPlay} slug={track.slug} />
          </div>
        </header>

        <dl className={styles.factList}>
          <div><dt>Artist</dt><dd>{track.artist}</dd></div>
          <div><dt>Album</dt><dd>{track.album}</dd></div>
          {duration ? <div><dt>Length</dt><dd>{duration}</dd></div> : null}
        </dl>

        {note.about ? (
          <section className={styles.detailSection}>
            <h2 className={styles.sectionLabel}>About</h2>
            <p className={styles.prose}>{note.about}</p>
          </section>
        ) : null}

        {note.comment ? (
          <section className={styles.detailSection}>
            <h2 className={styles.sectionLabel}>From me</h2>
            <blockquote className={styles.comment}>{note.comment}</blockquote>
          </section>
        ) : null}

        {lyrics ? (
          <section className={styles.detailSection}>
            <h2 className={styles.sectionLabel}>Lyrics &amp; chords</h2>
            <ChordSheet chords text={lyrics} />
          </section>
        ) : null}

        {track.notes_md ? (
          <section className={styles.detailSection}>
            <h2 className={styles.sectionLabel}>Notes</h2>
            <ChordSheet text={track.notes_md} />
          </section>
        ) : null}

        {rest.length ? (
          <section className={styles.moreSection}>
            <h2 className={styles.sectionLabel}>More from the library</h2>
            <TrackCollection tracks={rest} controls={false} limit={6} label="tracks" />
          </section>
        ) : null}
      </div>
    </div>
  );
}
