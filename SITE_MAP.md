# Site map

Concrete inventory of routes, API endpoints, and data — the "what exists and where" companion to `ARCHITECTURE.md` (system boundaries/conventions) and `MEMORY.md` (why things are the way they are). Keep this current when routes/tables change; it's meant to be trustworthy without reading git log.

## Workspace

```
apps/web        Next.js App Router site (the actual product)
apps/video      Remotion compositions, rendered separately, not deployed with the web runtime
packages/design-system   lucide-react icon wrappers with fixed stroke/fill defaults
packages/motion-system   shared motion timing tokens, reduced-motion helpers
packages/shared-scenes   face-derived SVG geometry shared by web + video
packages/content         Zod schemas for MDX frontmatter (blog/projects/tools)
```

## Pages (`apps/web/app`)

| Route | Source | Notes |
|---|---|---|
| `/` | `page.tsx` | Home |
| `/about` | `about/page.tsx` | |
| `/blog`, `/blog/archived`, `/blog/[slug]` | `blog/` | MDX, file-backed; `content/blog/archived/` holds older posts, listed only on the archive page |
| `/projects`, `/projects/[slug]` | `projects/` | MDX, file-backed |
| `/resources`, `/resources/[slug]` | `resources/` | MDX, file-backed |
| `/tools`, `/tools/<slug>` | `tools/` | List page uses shared `ProjectExplorer`; each tool slug is its own static page + client implementation (`focus-timer`, `contrast-checker`, `prompt-splitter`, `palette-ratio-checker`, `image-utilities`, `converter`, `downloader`, `encryption`, `password-utils`, `pc-checker`) |
| `/music`, `/music/[slug]` | `music/` | DB-backed library — grid + lyrics/chords/notes detail page |
| `/games`, `/games/[slug]` | `games/` | DB-backed — grid + sandboxed-iframe player |
| `/admin` | `admin/page.tsx` | Single-page dashboard: Posts, Projects, Tools, Comments, Music, Games. Client component, fetches `/api/admin/dashboard`, gated server-side by each API route (not by the page itself — the page renders and immediately redirects/errors if the dashboard fetch 401s/403s) |

Tool slugs live in `app/tools/tools-data.ts`; each tool's marketing copy is optional MDX under `content/tools/<slug>.mdx`, its implementation is `app/tools/<slug>/page.tsx`.

## API routes (`apps/web/app/api`)

Public (no auth):
- `GET /api/posts/[slug]/reactions`, `POST` — per-post reaction counts
- `GET/POST /api/comments`, `PATCH/DELETE /api/comments/[id]` — threaded comments (own-comment edit/delete only, not admin)
- `GET/POST /api/account` — session-cookie auth (signup/login/logout/whoami)
- `GET /api/music`, `GET /api/music/[slug]` — public music library reads
- `GET /api/games`, `GET /api/games/[slug]` — public games list/detail
- `POST /api/upload` — admin-gated file upload (audio/cover images); **not currently wired to any UI** — admin adds file paths manually instead, this endpoint predates that decision and is effectively dormant
- `GET/POST /api/tools/youtube-download` — server-side yt-dlp wrapper for the Downloader tool

Admin (session cookie + `public.users.is_admin`, see `app/api/admin/_lib.ts`):
- `GET /api/admin/dashboard` — aggregate read for the admin page
- `GET/POST /api/admin/content/[collection]`, `PATCH /api/admin/content/[collection]/[slug]` — blog/project MDX file CRUD (writes to disk, not DB)
- `PATCH /api/admin/tools/[slug]` — tool status (Live/Experimental/Paused)
- `DELETE /api/admin/comments/[id]` — moderation (hard delete, no soft-delete flag)
- `GET/POST /api/admin/music`, `PATCH/DELETE /api/admin/music/[id]` — music library CRUD (title/artist/album/paths/duration/lyrics_md/notes_md; slug is auto-generated on create, immutable after)
- `GET/POST /api/admin/games`, `PATCH/DELETE /api/admin/games/[id]` — games CRUD

## Database (Neon Postgres, `apps/web/db/*.sql`, hand-applied, `IF NOT EXISTS` throughout)

| Table | File | Purpose |
|---|---|---|
| `users`, `sessions` | `schema.sql` | scrypt password hashes, 30-day session cookie |
| `comments` | `schema.sql` | threaded via `parent_id`, one thread per content `slug` |
| `post_reactions` | `reactions-schema.sql` | per-post reaction counts |
| `music`, `admin_audit` | `admin-schema.sql` | + `users.is_admin` column; `admin_audit` logs every admin mutation (user_id, action, resource_type, resource_id, details jsonb) |
| `music.slug`/`lyrics_md`/`notes_md`, `games` | `music-games-schema.sql` | music library extras + the games table (title, slug, description, thumbnail_path, file_path) |

`apps/web/lib/db.ts` exports `commentsDb`, `null` when `DATABASE_URL` is unset — every consumer must handle that case rather than assume a connection.

## Client-global state

- `AudioProvider` (`components/music/AudioProvider.tsx`) — wraps the whole app in `app/layout.tsx`, owns the single `<audio>` element, current track, volume, and the floating/expanded player widget. Track list: DB (`/api/music`) primary, static `lib/tracks.generated.ts` fallback.
- `AccountProvider` — current logged-in user (session-cookie based), used by comments and account UI.
- `SoundProvider` / `lib/audio/soundEngine.ts` — shared Web Audio UI-sound engine, named presets, independent of the music player.
- Theme/accent/font-size preferences — `localStorage` (`nomu-appearance` key) + `data-theme`/`data-accent`/`data-font-size` on `<html>`, read by CSS custom properties in `styles/globals.css`. No server/account sync.

## Content authoring

- Blog/projects/resources: MDX under `apps/web/content/<collection>`, Zod-validated frontmatter, statically imported in `apps/web/lib/content.ts` (required for the Next.js MDX compiler — no dynamic `fs` read at that layer). Older posts live in `apps/web/content/blog/archived/` — same `/blog/<slug>` URLs, resolved via an `archived/` fallback in `readSource` and the admin file resolver.
- Music/games: DB rows, edited through `/admin`, not git-tracked content.
- Audio files: drop an `.mp3` in `public/audio/`, run `pnpm sync:tracks` (reads ID3 tags via `music-metadata`, extracts + square-crops cover art via `ffmpeg-static`, writes `lib/tracks.generated.ts`).
