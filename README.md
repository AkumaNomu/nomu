# Nomu's Blog

A static, GitHub Pages compatible blog and toolbox built with vanilla HTML/CSS/JS.

## Quick Start

1. Open `index.html` in a browser.
2. Write posts as `.md` files in `posts/`.
3. Regenerate metadata + publish artifacts:

```bash
node scripts/build-post-index.js
node scripts/build-post-pages.js
node scripts/build-feed.js
node scripts/build-sitemap.js
node scripts/build-robots.js
```

Set `SITE_URL` when generating publish artifacts:

```bash
SITE_URL=https://your-domain.example node scripts/build-feed.js
```

## In-Page View Routing

Navigation is SPA-like inside `index.html` (no full page reload), so music playback continues across views.

- `#home`: landing view
- `#blog`: posts list view
- `#now`: Now view
- `#uses`: Uses view
- `#setup`: Setup view
- `#tools` and `#tools/<tool>`: tools hub/panels (`hub`, `gpa`, `password`, `pomodoro`)
- `#post/<slug>`: single post view

Legacy URLs like `index.html?post=<slug>` and `index.html?view=tools` are still accepted and remapped to hash routes at load.

## Editing Now / Uses / Setup

Content for these views lives in `index.html` in the detail articles:

- `#now-details`
- `#uses-details`
- `#setup-details`

Update those sections directly. The router mounts them into the in-page info view at runtime.

## Tools Notes

All tools run client-side in `index.html` and persist settings in `localStorage`.

- GPA (`js/tool-gpa.js`)
  - Semester + cumulative modes
  - Scale presets (`/20`, `/4.0`, `/100`) + custom max
  - Save/load setups + CSV export
- Password (`js/tool-password.js`)
  - Password and passphrase modes
  - Local wordlist (`js/tools-wordlist.js`)
  - Entropy/strength meter, copy, auto-clear
- Pomodoro (`js/tool-pomodoro.js`)
  - Work/short/long cycle settings
  - Sound + desktop notifications
  - Persisted timer preferences

## Features

- Markdown post loader with search/filter + pagination
- Featured post card, share buttons, TOC, reactions, reading progress, back-to-top
- Related posts and series navigation (`series`, `part`, `total`)
- Giscus comments (lazy loaded)
- RSS feed, sitemap, robots, and per-post OG/Twitter metadata pages
- Service worker caching for GitHub Pages hosting

## Writing Posts

Use frontmatter like:

```yaml
---
title: Post Title
date: 2026-01-20
category: Life
excerpt: Brief description for listing
cover: assets/images/image.jpg
tags: dev, css, javascript
series: Site Updates
part: 2
total: 4
---
```

## Workflows

- `.github/workflows/generate-rss.yml`
- `.github/workflows/generate-sitemap.yml`

These keep `feed.xml`, `sitemap.xml`, `robots.txt`, and `post/**` updated on push.
