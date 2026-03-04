# Content Guide: Posts + Projects + Resources

This guide covers where content lives, which metadata is supported, and how the loader pulls it into cards and detail pages.

## Where the files live
- Posts: `content/posts/<Post Name>/<Post Name>.md`
- Projects: `content/projects/<Project Name>/<project-slug>.md`
- Resources: `content/resources/<Type>/<Resource Name>/<resource-slug>.md`

The loader uses the manifest arrays in `content/content.json`:
- `POST_MANIFEST`
- `PROJECT_MANIFEST`
- `RESOURCE_MANIFEST`

Add new names to those arrays or they will not show up. The loader will resolve paths for you.

## Post files (frontmatter)
Example:
```
---
id: MyPost
title: Post Title
description: Short one-liner for cards.
date: 2026-01-20
tags: Development | Projects
cover: content/posts/MyPost/MyPost.png
---
```

Supported fields:
- `id` (optional; defaults to folder name)
- `title` (required)
- `description` (card excerpt)
- `date` (optional)
- `tags` (pipe or comma-separated)
- `cover` (optional; card background image)
- `readTime` (optional; numeric, otherwise auto-estimated)

## Project files (frontmatter)
Example:
```
---
id: nomu-site
name: Nomu Personal Site
description: Short one-liner for cards.
category: Development
focus: Web
type: Project
icon: terminal
stack: Vanilla JS, Markdown, UI/UX
url: https://github.com/yourusername/yourproject
repo: https://github.com/yourusername/yourproject
live:
video:
gallery: content/projects/Nomu's Site/nomu-site.png::Homepage
featured: true
cover: content/projects/Nomu's Site/nomu-site.png
badge: In Progress
---
```

Supported fields:
- `id` (optional; defaults to slugified folder name)
- `name` (required)
- `description` (card excerpt)
- `category` (required; `Development`, `Motion Design`, `Video Editing`)
- `focus` (optional; `AI` or `Web` when category is `Development`)
- `type` (optional; defaults to `Project`)
- `icon` (one of: `terminal`, `palette`, `database`, `git`)
- `stack` (pipe or comma-separated)
- `url` (optional; detail action button)
- `repo` (optional; detail action button)
- `live` (optional; detail action button)
- `video` (optional; local/remote video source)
- `gallery` (optional; `path::caption | path::caption`)
- `featured` (true/false; shown on home)
- `cover` (optional; card background image)
- `badge` (optional; small label on card)

## Resource files (frontmatter)
Example:
```
---
id: piracy-guide
title: Your first journey on the seven seas
desc: A quick guide on how to start piracy.
type: Guide
difficulty:
url: https://www.qbittorrent.org/download
cover: content/resources/Guides/Piracy Guide/piracy-guide.png
video:
gallery: content/resources/Guides/Piracy Guide/piracy-guide.png::Flow chart
steps: Install client | Bind VPN interface | Use trusted indexers | Verify file health
quickLinks: qBittorrent::https://www.qbittorrent.org/download | FitGirl Repacks::https://fitgirl-repacks.site
---
```

Supported fields:
- `id` (optional; defaults to slugified folder name)
- `title` (required)
- `desc` (card excerpt)
- `type` (type-driven taxonomy, e.g. `Guide`, `Tutorial`, `Book`, `Site`, `App`, `Course`)
- `difficulty` (optional)
- `url` (optional; detail action button)
- `cover` (optional)
- `video` (optional; local/remote video source)
- `gallery` (optional; `path::caption | path::caption`)
- `steps` (optional; pipe-separated outline items)
- `quickLinks` (optional; `Label::URL | Label::URL`)

Parsing rules:
- `steps` uses `|` separators
- `quickLinks` uses `Label::URL` pairs separated by `|`
- Missing `steps`/`quickLinks` are allowed and render as empty placeholders in UI

## Images
Store images alongside each markdown file and reference them with a relative path in frontmatter.
Recommended size for card images: 1200x675 or 1600x900 (16:9 works best).

## Quick add checklist
1. Create the markdown file in `content/posts/`, `content/projects/`, or `content/resources/`.
2. Add the name to the corresponding manifest array in `content/content.json`.
3. Add a cover image next to the markdown file and update `cover` in frontmatter.
4. Refresh the page.
