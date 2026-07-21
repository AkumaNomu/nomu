# Nomu — personal editorial site

Monochrome personal site for writing, projects, experiments, and small tools. The repository is a pnpm workspace containing a Next.js site, a Remotion studio, and shared visual/motion packages.

## Requirements

- Node.js 20.9 or newer
- pnpm 10

## Install and run

```bash
pnpm install
pnpm dev
```

The web app opens at `http://localhost:3000`.

```bash
pnpm --filter video dev
```

The second command opens Remotion Studio independently. To build every workspace:

```bash
pnpm build
pnpm lint
pnpm typecheck
```

For a production web server:

```bash
pnpm --filter web build
pnpm --filter web start
```

## Workspace map

- `apps/web`: Next.js App Router site and MDX content
- `apps/video`: Remotion compositions and render entry point
- `packages/design-system`: framework-light SVG icons
- `packages/motion-system`: shared timing tokens and motion preference helpers
- `packages/shared-scenes`: face-derived SVG geometry shared by web and video
- `packages/content`: shared metadata schemas and types

## Authoring content

Editable copy lives in `apps/web/content`. Use `writing`, `projects`, `tools`, or `pages` according to the content type. Each MDX document starts with YAML frontmatter. Metadata is parsed with `gray-matter`, validated with Zod, and rejected at build time when invalid.

### Add an article

1. Copy an existing file in `apps/web/content/writing`.
2. Give the file and `slug` the same URL-safe name.
3. Fill all required frontmatter fields.
4. Add the static import to the writing registry in `apps/web/lib/content.ts`.
5. Write normal Markdown or use the components listed in `CONTENT_GUIDE.md`.

Reading time is derived from body text; the author does not maintain it.

### Add a project

Create an MDX file under `apps/web/content/projects`, provide year/status/technology metadata, then register the static MDX import. Optional `repository` and `website` values must be valid URLs.

### Add a tool

Tool descriptions live in `apps/web/content/tools`. Interactive implementations live under `apps/web/app/tools/<slug>`. Keep calculators local and deterministic.

### Enable shared comments with Neon

Comments use the Neon serverless driver through `apps/web/app/api/comments/route.ts`.

1. Create a Neon project and copy its pooled connection string into `DATABASE_URL` in `apps/web/.env.local`.
2. Run `apps/web/db/schema.sql` once in the Neon SQL Editor.
3. Add `DATABASE_URL` to the deployment environment (never expose it as a `NEXT_PUBLIC_` variable).

Without the variable or schema, article comments show a clear setup state instead of writing to browser storage. Replies use `parent_id` and are returned as threaded conversations.

### Add music

Track metadata lives in `apps/web/lib/tracks.ts`. The included demo tracks use
generated local WAV tones, so the repository contains no unlicensed music.
Album art belongs in `apps/web/public/album-art`.

Set `NEXT_PUBLIC_YOUTUBE_PLAYLIST_URL` to use a full YouTube or YouTube Music
playlist URL, or set `NEXT_PUBLIC_YOUTUBE_PLAYLIST_ID` to use only the playlist
id. You can also set `NEXT_PUBLIC_SOUNDCLOUD_PLAYLIST_URL` for SoundCloud.
YouTube takes priority when both values exist. The global widget always offers
the local playlist as a fallback. It persists the selected source, track, and
volume while client-side navigation keeps playback alive.

## Animation architecture

Motion has explicit ownership:

- GSAP runs hero timelines, face transforms, and selected ScrollTrigger sequences.
- Lenis runs desktop smooth scrolling through the same GSAP ticker. It is disabled below 768px and under reduced-motion.
- Motion handles the mobile menu, tool state transitions, press feedback, and player feedback.
- Pretext measures the hero with the active local Geist font and provides deterministic lines. The semantic unmeasured heading remains the pre-JavaScript fallback.

There is one Lenis instance and one ticker integration in `MotionProvider`. Every route-level GSAP component creates a scoped context and reverts it on unmount. See `MOTION_GUIDE.md`.

## Remotion

```bash
pnpm --filter video dev
pnpm --filter video build
pnpm --filter video render:article
```

The studio exposes `ArticleCover`, `ProjectTeaser`, `MusicVisualizer`, and `SiteIntro`. Shared SVG scenes stay free of Remotion timing hooks, so Next.js can use the same geometry without shipping Remotion.

## SEO and generated files

The App Router produces page metadata, canonical links, sitemap, robots rules, RSS, JSON-LD, and a generated Open Graph image. Set `NEXT_PUBLIC_SITE_URL` for the deployed canonical origin.

## Deployment

Deploy `apps/web` through any Node-compatible Next.js host. From the monorepo root, install with pnpm and run `pnpm --filter web build`. Configure `DATABASE_URL` in the host when using comments. Do not deploy the Remotion studio with the web runtime; render assets separately and copy final media into `apps/web/public`.

More detail: `ARCHITECTURE.md`, `CONTENT_GUIDE.md`, `MOTION_GUIDE.md`, and `DESIGN_SYSTEM.md`.
