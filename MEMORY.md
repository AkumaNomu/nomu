# Project memory

Running log of notable decisions and feature work, for agents picking up this codebase cold. Newest first. This is a changelog of *intent and context* — for current file/route/schema facts, read `SITE_MAP.md` (always current) rather than trusting dates below once code has moved on.

## Icon system unification

All hand-written inline `<svg>` UI glyphs were migrated to `lucide-react` (the settings gear, blog grid/list view toggle, tools category glyphs, primary nav). `packages/design-system/src/icons.tsx` already wrapped lucide under `PlayIcon`/`PauseIcon`/`SkipIcon`/`SearchIcon`/`ArrowIcon` — that pattern is the model for any icon needing fixed stroke/fill defaults reused across the app. Decorative/data-driven SVG (the MDX chart sparkline in `MdxComponents.tsx`) intentionally stays custom — it's not a swappable glyph. Primary nav is icon-only now (was text labels) — each `<Link>` carries `aria-label`/`title` for accessible names since visible text was removed.

## Settings panel: modal redesign

The site-settings UI was originally a `<details>`-anchored dropdown pinned to the top-right of the header, styled with hardcoded dark colors regardless of site theme, and included login/signup inline. It's now a controlled (`useState`) centered modal — backdrop, explicit close button, Escape/click-outside to close, body-scroll lock — themed off the same CSS vars as the rest of the site. Login/signup was removed from it entirely; `AccountPanel` (the shared login/signup UI) still lives on the comments section where it originally also appeared.

## Music player: DB-backed, theme-aware

The persistent site-wide music widget (`components/music/AudioProvider.tsx` + `MusicWidget.tsx`) has three states — icon → floating (hover preview, auto-hides after 15s) → expanded (stays until manually collapsed) — and now pulls its track list from `/api/music` (the DB library) rather than only the static ID3-scanned `lib/tracks.generated.ts`; the static list is kept as a fallback when the DB is empty/unreachable, not removed. The widget's colors were hardcoded dark (`#0d0d0d`-family) regardless of site theme; it now uses the same `--paper`/`--foreground`/`--glass` vars as the rest of the chrome. Clicking the album art in the expanded player toggles play/pause (with a hover overlay affordance); the floating pill shows the track title, not just art+waveform.

## Music library feature (new)

Added a public "songs I like" library distinct from — but feeding — the site's playback widget. `public.music` (already existed for admin-managed track metadata) gained `slug`, `lyrics_md`, `notes_md` columns (`db/music-games-schema.sql`). Lyrics/notes are rendered by a small dependency-free markdown-lite + inline-chord-tag component (`components/music/ChordSheet.tsx`) rather than a real MDX/markdown engine — deliberately: it builds React elements directly (no `dangerouslySetInnerHTML`, no MDX `evaluate()`), so it can't execute arbitrary code even though the content comes from an admin-editable DB field. Chord notation is inline `[Am]` tags à la ChordPro. Track selection ("what plays on the site") is **per-visitor only** — a visitor's pick is `localStorage`-scoped, there is no shared/synced "now playing" state.

Admin edits tracks (including lyrics/chords/notes) through the existing `/admin` dashboard's Music section — no separate upload UI exists; audio files and cover art are placed on disk manually (matching the pre-existing `public/audio` + `pnpm sync:tracks` workflow), the DB row is metadata only.

## Games section (new)

Added `public.games` (title, slug, description, thumbnail_path, file_path) plus admin CRUD and public `/games` + `/games/[slug]` pages. Deliberately the simplest viable format: a game is one self-contained HTML file the site owner drops into `public/games/` by hand and registers via the admin form — no upload endpoint, no zip/bundle extraction pipeline (that was considered and explicitly rejected as unnecessary complexity for "simple, offline, my own games"). The game plays in a sandboxed `<iframe sandbox="allow-scripts allow-pointer-lock">` — no `allow-same-origin`, so a game can't read/write the site's cookies or storage even though it's same-site.

## Album art: square-crop pipeline

Embedded ID3 cover art extracted by `scripts/sync-tracks.mjs` wasn't guaranteed square, causing letterboxing wherever it was displayed at a fixed square size. `scripts/crop-covers.mjs` (uses the `ffmpeg-static` binary already a project dependency — no new dependency added) center-crops raster covers to square; it's both a standalone script (`pnpm crop:covers`, already run once against existing covers) and a function imported by `sync-tracks.mjs` so every future extracted cover is square automatically, not just a one-time fix.
