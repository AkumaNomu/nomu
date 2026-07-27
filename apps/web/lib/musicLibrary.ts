import { tracks as fileTracks } from "./tracks";
import { slugify } from "./slugify";

// Neutral gray note glyph — used whenever a DB track has no artwork_path, so
// <Image> never points at a missing file. Shared by server pages and the
// client-side AudioProvider.
export const FALLBACK_ARTWORK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23222'/%3E%3Cpath d='M24 40a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0 0V16l18-4v20' stroke='%23888' stroke-width='2.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

export type LibraryTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  src: string;
  slug: string;
  durationMs?: number;
  source: "db" | "file";
};

export type MusicRow = {
  id: string;
  title: string;
  artist: string;
  album: string;
  file_path: string;
  artwork_path?: string;
  duration_ms?: number;
  slug: string;
};

// mp3 paths are percent-encoded in the generated file list but usually stored
// raw in the DB, so both sides have to be normalised before they can be
// compared — otherwise the same song shows up twice in the library.
function srcKey(src: string) {
  try { return decodeURIComponent(src).toLowerCase(); } catch { return src.toLowerCase(); }
}

export function fileTrackSlug(title: string, artist: string) {
  return slugify(`${title}-${artist}`);
}

// The admin-managed DB rows and the file-scanned public/audio tracks are two
// halves of one library: DB rows win on conflict (they carry lyrics/notes and
// a stable slug), file tracks fill in anything that was never imported.
// Both the server pages and the client AudioProvider merge through here so
// slugs line up and `playTrackBySlug` resolves either kind.
export function mergeLibraryTracks(rows: MusicRow[]): LibraryTrack[] {
  const merged: LibraryTrack[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    artwork: row.artwork_path || FALLBACK_ARTWORK,
    src: row.file_path,
    slug: row.slug,
    durationMs: row.duration_ms,
    source: "db",
  }));

  const known = new Set(merged.map((track) => srcKey(track.src)));
  const takenSlugs = new Set(merged.map((track) => track.slug));

  for (const track of fileTracks) {
    if (known.has(srcKey(track.src))) continue;
    let slug = fileTrackSlug(track.title, track.artist);
    while (takenSlugs.has(slug)) slug = `${slug}-2`;
    takenSlugs.add(slug);
    merged.push({
      id: `file:${slug}`,
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: track.artwork || FALLBACK_ARTWORK,
      src: track.src,
      slug,
      source: "file",
    });
  }

  return merged;
}

export function formatDuration(ms?: number) {
  if (!ms || !Number.isFinite(ms)) return "";
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
