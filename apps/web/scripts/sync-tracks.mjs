#!/usr/bin/env node
// Regenerates lib/tracks.generated.ts from the mp3 files in public/audio/.
//
// The site's only source of truth for a track is the mp3 file itself: drop
// an mp3 (with embedded ID3 title/artist/album/cover art) into public/audio/
// and rerun this script (`pnpm sync:tracks`). It reads each file's tags,
// extracts the embedded cover image to public/album-art/, and writes a
// generated data file — no metadata is ever hand-duplicated elsewhere.

import { parseFile } from "music-metadata";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cropToSquare } from "./crop-covers.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const audioDir = path.join(webRoot, "public", "audio");
const artDir = path.join(webRoot, "public", "album-art");
const outFile = path.join(webRoot, "lib", "tracks.generated.ts");

const EXT_BY_MIME = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function uniqueSlug(base, used) {
  let slug = base;
  let n = 2;
  while (used.has(slug)) slug = `${base}-${n++}`;
  used.add(slug);
  return slug;
}

mkdirSync(artDir, { recursive: true });

const files = readdirSync(audioDir).filter((file) => /\.mp3$/i.test(file)).sort();
if (files.length === 0) {
  console.error(`No .mp3 files found in ${audioDir}`);
  process.exit(1);
}

const usedSlugs = new Set();
const tracks = [];

for (const file of files) {
  const filePath = path.join(audioDir, file);
  const { common } = await parseFile(filePath, { duration: false, skipCovers: false });

  const title = common.title?.trim() || path.basename(file, path.extname(file));
  const artist = common.artist?.trim() || common.albumartist?.trim() || "Unknown Artist";
  const album = common.album?.trim() || title;
  const slugBase = slugify(title) || slugify(path.basename(file, path.extname(file))) || "track";
  const slug = uniqueSlug(slugBase, usedSlugs);

  const picture = common.picture?.[0];
  let artwork = "/album-art/soft-loop.svg"; // fallback for mp3s with no embedded art
  if (picture) {
    const ext = EXT_BY_MIME[picture.format] ?? "jpg";
    const coverPath = path.join(artDir, `${slug}.${ext}`);
    writeFileSync(coverPath, picture.data);
    cropToSquare(coverPath);
    artwork = `/album-art/${slug}.${ext}`;
  }

  tracks.push({ title, artist, album, artwork, src: `/audio/${encodeURIComponent(file)}` });
  console.log(`✓ ${file} -> "${title}" by ${artist}${picture ? "" : " (no embedded cover)"}`);
}

const body = `// GENERATED FILE — do not edit by hand.
// Run \`pnpm sync:tracks\` (apps/web/scripts/sync-tracks.mjs) after adding or
// removing mp3s in public/audio/ to regenerate this from ID3 tags.

import type { Track } from "./tracks";

export const generatedTracks: Track[] = ${JSON.stringify(tracks, null, 2)};
`;

writeFileSync(outFile, body);
console.log(`\nWrote ${tracks.length} tracks to ${path.relative(webRoot, outFile)}`);
