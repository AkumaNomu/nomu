# Agent instructions

Operating notes for any AI agent (Claude, Codex, Copilot, etc.) working in this repository. Read this before making changes. See `SITE_MAP.md` for the concrete route/data inventory and `ARCHITECTURE.md` for system boundaries.

## Commands

```bash
pnpm install
pnpm dev              # apps/web at http://localhost:3000
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
pnpm --filter web sync:tracks     # rescan public/audio/*.mp3 -> lib/tracks.generated.ts
pnpm --filter web crop:covers     # force-crop public/album-art/* to square
```

Always run `typecheck` and `lint` (scoped to `apps/web`) after edits there — both are fast and catch most regressions before a browser check is needed.

## Conventions this codebase actually follows

- **Icons: lucide-react only.** No hand-written inline `<svg>` for UI glyphs (buttons, nav, toggles). `packages/design-system/src/icons.tsx` wraps a handful of lucide icons (`PlayIcon`, `PauseIcon`, `SkipIcon`, `SearchIcon`, `ArrowIcon`) for consistent stroke/fill defaults — prefer those where they already exist, otherwise import directly from `lucide-react`. Raw `<svg>` is only acceptable for genuinely custom art (data-driven charts, brand marks) — not swappable icon glyphs.
- **Theming: CSS custom properties, never hardcoded colors.** `apps/web/styles/globals.css` defines `--foreground`, `--background`, `--paper`, `--muted`, `--line`, `--soft-line`, `--glass`, `--glass-shadow`, `--hover-fill`, `--accent` for both `:root` (light) and `:root[data-theme="dark"]`. Any new UI must use these vars, not literal hex/rgba, or it'll look wrong in one theme. `color-mix(in srgb, var(--foreground) N%, transparent)` is the idiom for subtle tints.
- **Style is dense, not spread out.** Existing components (`Comments.tsx`, `SiteHeader.tsx`, admin page) write long single-line JSX and inline handlers rather than extracting many small named functions. Match that density in files you touch; don't refactor toward a different style uninvited.
- **No comments explaining what code does.** Only comment non-obvious *why* (a workaround, a subtle invariant, a cross-file dependency). This repo's existing comments follow that rule — keep it that way.
- **Admin auth pattern**: every `/api/admin/**` route calls a `requireAdmin()` that checks a session cookie against `public.sessions`/`public.users.is_admin`, then throws a typed error mapped to an HTTP status. `apps/web/app/api/admin/_lib.ts` has the shared version (`requireAdmin`, `adminErrorStatus`, `writeAuditLog`) — new admin routes should use it rather than re-declaring their own copy (a few older routes duplicate it locally; don't propagate that further).
- **DB access**: `commentsDb` from `apps/web/lib/db.ts` is a Neon serverless tagged-template client, `null` when `DATABASE_URL` is unset. Every route that touches it must handle the `null` case (return an empty list / a clear "Database not configured" error) — the site has to degrade gracefully without a database, not crash.
- **Public vs admin API split**: DB-backed features (music, games, comments) have a public read-only route under `/api/<thing>` and an authenticated CRUD route under `/api/admin/<thing>`. Follow this split for new DB-backed sections rather than gating one endpoint by role internally.
- **Migrations are plain `.sql` files** under `apps/web/db/`, hand-applied (there's no migration runner). They must be idempotent (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`) since there's no tracking of which have run. After writing one, actually run it against `DATABASE_URL` (see `lib/db.ts`) — ask the user first, it's their live database.
- **Content is file-based where possible.** Blog/projects/resources are MDX under `apps/web/content/`, validated with Zod schemas in `packages/content`, registered via static imports in `apps/web/lib/content.ts` (Next.js needs static imports to bundle MDX — no dynamic `fs` reads at the content layer for those three collections). Music and games are the exception: they're DB rows because they need admin CRUD from a browser UI, not git commits.
- **Sound design**: `apps/web/lib/audio/soundEngine.ts` is a single shared Web Audio engine with named presets (`hover`, `tap`, `open`, `close`, `confirm`, `toggle`, `next`, `error`). Call `sound.play("...")` for UI feedback instead of adding new `<audio>` elements or ad hoc Web Audio code.
- **Motion**: GSAP owns hero/scroll timelines, `motion/react` (Framer Motion) owns component-level enter/exit and press states, Lenis owns smooth scroll. Don't introduce a fourth animation approach — see `MOTION_GUIDE.md`.

## Things that will bite you

- Windows dev environment: paths with the literal apostrophe in "Nomu's site" break some tools' relative-path handling — prefer absolute paths in shell commands run from tooling, and expect `cd` inside compound commands to sometimes fail silently.
- `pnpm dev` may already be running on port 3000 from a previous session; Next.js will pick another port and print a warning rather than fail. Check for an already-running dev server before assuming one needs to be started.
- Typed routes (`next.config`'s `typedRoutes`) mean `<Link href={`/x/${slug}`}>` needs `as Route` from `"next"` for freshly-added dynamic segments until the route types regenerate — see any `MdxComponents.tsx` usage for the pattern.
- ffmpeg is available as a project dependency (`ffmpeg-static`, already used for video tooling) — reach for it before adding a new image/video processing dependency.
