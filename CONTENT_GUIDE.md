# Content Guide: Projects + Resources

This guide covers where content lives, which metadata is supported, and how the Content Hub pulls it into cards and detail pages.

## Where the files live
- Posts: `content/posts/<Post Name>/<Post Name>.md`
- Projects: `content/projects/<Project Name>/<project-slug>.md`
- Resources: `content/resources/<Type>/<Resource Name>/<resource-slug>.md`

The loader uses the manifest arrays in `content/content.json`:
- `POST_MANIFEST`
- `PROJECT_MANIFEST`
- `RESOURCE_MANIFEST`

Add new names to those arrays or they will not show up. The loader will resolve paths for you.

## Project files (frontmatter)
Example frontmatter from `content/projects/Nomu's Site/nomu-site.md`:
```
---
title: Nomu Personal Site
slug: nomu-site
id: nomu-site
date: 2025-12-24
type: Website
status: In Progress
description: Short one‑liner for cards.
summary: Longer summary for the project header.
cover: content/projects/Nomu's Site/Nomu's_Site.png
logo: content/projects/Nomu's Site/Nomu's_Site.png
tags: Vanilla JS, Markdown, UI/UX, Blog Engine
relatedPosts: NomuSite | SUpdate1 | SUpdate2
album: [{"src":"content/projects/Nomu's Site/Nomu's_Site.png","alt":"Nomu site home screen","caption":"Current homepage layout."}]
repo: https://github.com/akumanomu/nomu
live:
video:
---
```

Supported fields:
- `title` (required)
- `slug` (optional; defaults to filename without `.md`)
- `id` (optional; defaults to `slug`)
- `date` (optional)
- `type` (used for chips + filters)
- `status` (used for chips + “In Progress” list)
- `description` (card excerpt)
- `summary` (detail header)
- `cover` (card background image)
- `logo` (small logo shown on card + header; if omitted, `cover` is used)
- `tags` (comma or pipe-separated)
- `relatedPosts` (pipe or comma-separated; must match post slugs)
- `album` (JSON array of `{src, alt, caption}` items)
- `repo`, `live`, `video` (optional links shown as buttons)

Notes:
- `type` and `status` are used in filters and chips, so keep them consistent.
- “In Progress” in the left rail is picked up by status strings like `In Progress`, `WIP`, or `Active`.

## Resource files (frontmatter)
Example frontmatter from `content/resources/Tutorials/Starter Tutorial/starter-tutorial.md`:
```
---
title: Starter Tutorial: Build a Small Markdown Blog
date: 2026-02-15
type: Tutorial
icon: fas fa-graduation-cap
excerpt: One‑liner shown on cards.
summary: Longer summary for the detail header.
cover: content/resources/Tutorials/Starter Tutorial/starter-tutorial.png
downloads: Starter checklist::https://developer.mozilla.org/ | Markdown guide::https://www.markdownguide.org/basic-syntax/
steps: Set up folders | Parse frontmatter | Build cards
---
```

Supported fields:
- `title` (required)
- `slug` (optional; defaults to filename without `.md`)
- `date` (optional)
- `type` (Guide / Tutorial / Docs / Reference, used for chips + filters)
- `icon` (Font Awesome class for the card icon)
- `excerpt` (card excerpt)
- `summary` (detail header)
- `cover` (card background image)
- `downloads` (pipe list, `Label::URL | Label::URL`)
- `steps` (pipe list)

## External resources
External resources are defined in `EXTERNAL_RESOURCES` inside `js/blog-loader.js`. Add new entries there for links that do not have a local markdown file.

## Images
Store images alongside each markdown file and reference them with a relative path in frontmatter (`cover`, `logo`, `album`).
Recommended size for card images: 1200x675 or 1600x900 (16:9 works best).

## Quick add checklist
1. Create the markdown file in `content/posts/`, `content/projects/`, or `content/resources/`.
2. Add the name to the corresponding manifest array in `content/content.json`.
3. Add a cover image next to the markdown file and update `cover` in frontmatter (or let the loader infer it).
4. Refresh the page.


