#!/usr/bin/env node
// Center-crops every raster cover in public/album-art/ to a square, in place.
// SVG placeholders are left alone — they're hand-drawn icons, not photos, and
// scale losslessly regardless of aspect ratio.
//
// Run standalone (`node scripts/crop-covers.mjs`) to fix existing covers, or
// call cropToSquare() from sync-tracks.mjs right after a new cover is
// extracted from ID3 tags, so future covers never need this pass again.

import { execFileSync } from "node:child_process";
import { readdirSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const artDir = path.join(webRoot, "public", "album-art");
const RASTER_EXT = /\.(jpe?g|png|webp)$/i;

export function cropToSquare(filePath) {
  const tmpPath = `${filePath}.tmp${path.extname(filePath)}`;
  execFileSync(ffmpegPath, [
    "-y",
    "-i", filePath,
    "-vf", "crop='min(iw,ih)':'min(iw,ih)'",
    "-frames:v", "1",
    tmpPath,
  ], { stdio: ["ignore", "ignore", "pipe"] });
  renameSync(tmpPath, filePath);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const files = readdirSync(artDir).filter((file) => RASTER_EXT.test(file));
  for (const file of files) {
    const filePath = path.join(artDir, file);
    try {
      cropToSquare(filePath);
      console.log(`✓ cropped ${file}`);
    } catch (error) {
      console.error(`✗ ${file}:`, error.message);
    }
  }
  console.log(`\nDone: ${files.length} cover(s) checked.`);
}
