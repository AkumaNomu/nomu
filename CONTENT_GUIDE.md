# Content guide

This guide explains how to author validated MDX content, assign visual assets,
and use the built-in editorial data components.

## Writing frontmatter

Every writing entry needs a local cover image. Store covers in
`apps/web/public/covers` and reference them with an absolute public path.

```yaml
---
title: Why Constraints Make Better Work
slug: why-constraints-make-better-work
cover: /covers/why-constraints-make-better-work.svg
description: How limitations lead to clearer thinking and stronger outcomes.
publishedAt: 2024-05-14
updatedAt: 2024-06-02
category: Design
tags: [constraints, design, practice]
featured: true
draft: false
---
```

The content loader generates `readingTime`. Drafts are excluded from production.
Use ISO `YYYY-MM-DD` dates.

## Project frontmatter

Every project needs a local square icon in `apps/web/public/project-icons`.
Use one of `planning`, `building`, `shipped`, `paused`, or `archived` for
`status`.

```yaml
---
title: Trace
slug: trace
icon: /project-icons/trace.svg
description: A capture and connection tool for ideas.
year: 2024
status: building
role: Design and engineering
technologies: [Next.js, TypeScript, MDX]
featured: true
---
```

The `repository` and `website` fields are optional validated URLs.

## Tool frontmatter

Tool entries describe locally implemented utilities. Use one of `live`,
`experimental`, or `paused` for `status`.

Required fields are `title`, `slug`, `description`, `category`, and `status`.
The `featured` field is optional.

## Editorial MDX components

MDX files can use these components without imports:

- `Callout`, `PullQuote`, and `Aside` for editorial emphasis.
- `Figure`, `Gallery`, and `Video` for media.
- `CodeDemo` and `ToolEmbed` for interactive examples.
- `ProjectLink` and `ArticleLink` for related content.
- `Timeline` for ordered milestones.
- `DataTable` for accessible tabular data.
- `BarChart` and `LineChart` for compact data visualizations.
- `MetricGrid` for key values and short supporting notes.
- `MusicCue` for in-post song switches (`slug`, optional `label`).

### Data table

Use stable column keys that match each row object.

```mdx
<DataTable
  caption="Feedback signals"
  columns={[
    { key: "signal", label: "Signal" },
    { key: "cadence", label: "Cadence" },
    { key: "count", label: "Count", align: "right" },
  ]}
  rows={[
    { signal: "User notes", cadence: "Weekly", count: 12 },
    { signal: "Build failures", cadence: "Daily", count: 3 },
  ]}
/>
```

### Bar and line charts

Charts accept numeric `value` fields. Give each line chart a page-unique `id`
and a description that explains its conclusion.

```mdx
<BarChart
  title="Time to feedback"
  unit="h"
  data={[
    { label: "Prototype", value: 2 },
    { label: "Pilot", value: 12 },
    { label: "Launch", value: 48 },
  ]}
/>

<LineChart
  id="weekly-signal-volume"
  title="Signal volume by week"
  description="Signal volume increased from four to fourteen observations."
  data={[
    { label: "Week 1", value: 4 },
    { label: "Week 2", value: 7 },
    { label: "Week 3", value: 11 },
    { label: "Week 4", value: 14 },
  ]}
/>
```

### Metric grid

Use metric grids for a small set of values, not as a replacement for prose.

```mdx
<MetricGrid
  items={[
    { label: "Cycle time", value: "2 days", note: "From idea to test." },
    { label: "Signals", value: "14", note: "Observed this month." },
  ]}
/>
```

## Authoring rules

Keep heading levels ordered, links descriptive, and paragraph lengths focused.
Store meaningful media in `apps/web/public` and provide descriptive alt text.
Use an empty alt string only when the same information already appears nearby.

Copy `apps/web/content/templates/article-with-data.mdx` when you need a complete
data-rich article starting point.

## Post soundtracks

A post can declare music that starts when the post opens, and drop markers
that switch songs as the reader scrolls. Track slugs come from
`apps/web/lib/tracks.generated.ts` (file tracks) or the music library in
`/admin` (DB rows share the same slug space as `/music`).

```yaml
soundtrack:
  - quiet-system-unknown-artist
  - soft-loop-unknown-artist
```

```mdx
<MusicCue slug="quiet-system-unknown-artist" label="Reading music" />
```

The opening soundtrack is a throwaway queue: it plays through the listed
tracks, and leaving the post leaves the music playing. Each cue fires once
when it crosses the middle of the viewport; the pill stays clickable for
manual replay. If the browser blocks autoplay, the player just stays paused.

## Password-protected posts

A post with `protected: true` shows its title, description, and cover everywhere
(listings, search, feed, sitemap) but renders a password gate instead of its
body. The body and password hash never ship to the browser — listings only
carry metadata. Unlocking verifies the password server-side and sets a
short-lived httpOnly cookie, after which the page renders the full article
through the normal MDX pipeline (same components, TOC, and styling).

```yaml
protected: true
passwordHash: "<sha256 hex of the password>"
passwordHint: "Where we first met"   # optional, shown on the gate
```

Generate the hash (never commit the plain password):

```bash
node -e "console.log(require('crypto').createHash('sha256').update('your-password','utf8').digest('hex'))"
```

Notes: unlock attempts are throttled (10/minute per post), cookies last one
hour, and search indexes metadata only. Set `UNLOCK_SECRET` in production so
cookies survive restarts and deploys. This keeps honest readers out — it is not
NSA-grade: anyone with repo access can read the source file.
