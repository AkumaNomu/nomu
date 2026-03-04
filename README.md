# Nomu's Blog

A modern, minimalist blog built with vanilla JavaScript and Markdown.

## Quick Start

1. Install deps: `npm install`
2. Build CSS once: `npm run build:css`
3. Open `index.html` in your browser
4. (Optional) Watch CSS while editing: `npm run watch:css`

## Tailwind CSS Workflow

- Source stylesheet: `css/tailwind.src.css`
- Generated artifact (committed): `css/styles.css`
- Tailwind scans: `index.html` and `js/**/*.js`
- Keep runtime-dynamic style updates in JS (`style.width`, CSS vars, transforms) as-is.

## Features

-  Search & filter posts
-  Mobile responsive design
-  Background music player
-  Auto-generated table of contents
-  Simple Markdown posts
-  Comments system ready

## Writing Posts

Create a new .md file in `content/posts/` with this format:

```markdown
---
id: PostSlug
title: Post Title
description: Brief description for listing
date: 2026-01-20
tags: Life | Projects
cover: content/posts/<Post Name>/<image>.png
---

# Your content in Markdown
```

**Tags (examples):** Development | Video Editing | Life | Projects | Politics

## Customization

See DEVELOPMENT.md for complete guide including:
- Theme colors & styling
- Background music setup
- Comments implementation
- Mobile/Desktop features
- Feature roadmap

---

Built with  by Nomu
