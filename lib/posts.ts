import { promises as fs } from "node:fs";
import path from "node:path";
import { buildMarkdownLookup, compileMarkdown, getAllMarkdownNotes, POSTS_ROOT } from "@/lib/markdown";
import type { ArchiveEntry, EntryType } from "@/types/archive";

export type PostFilters = {
  query?: string | null;
  type?: EntryType | null;
  tag?: string | null;
};

type MarkdownFrontmatter = {
  slug?: string;
  title?: string;
  subtitle?: string;
  excerpt?: string;
  quote?: string;
  ref?: string;
  type?: EntryType;
  category?: string;
  tags?: string[] | string;
  publishedAt?: string | Date;
  coverImage?: string;
  coverAlt?: string;
  soundtrackTitle?: string;
  soundtrackArtist?: string;
  soundtrackService?: "youtube" | "soundcloud";
  soundtrackUrl?: string;
  soundtrackFallbackSrc?: string;
  featured?: boolean;
  isPublished?: boolean;
};

function asDateString(value: string | Date | undefined, fallback: string) {
  if (!value) return fallback;
  if (value instanceof Date) return value.toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? fallback : parsed.toISOString();
}

function asStringArray(value: string[] | string | undefined) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function getExcerpt(frontmatter: MarkdownFrontmatter, paragraphs: string[]) {
  if (frontmatter.excerpt?.trim()) return frontmatter.excerpt.trim();
  return paragraphs.join(" ").slice(0, 220).trim();
}

function getRef(frontmatter: MarkdownFrontmatter, slug: string) {
  return frontmatter.ref?.trim() || slug.toUpperCase().slice(0, 8);
}

function inferId(sourcePath: string) {
  return path.relative(POSTS_ROOT, sourcePath).replace(/\\/g, "/");
}

function getSortValue(entry: ArchiveEntry) {
  return Number(new Date(entry.publishedAt));
}

function applyLocalFilters(entries: ArchiveEntry[], filters: PostFilters = {}) {
  const query = filters.query?.trim().toLowerCase();
  const tag = filters.tag?.trim().toLowerCase();

  return entries
    .filter((entry) => (filters.type ? entry.type === filters.type : true))
    .filter((entry) => (tag ? entry.tags.some((item) => item.toLowerCase() === tag) : true))
    .filter((entry) => {
      if (!query) return true;
      const haystack = [entry.title, entry.subtitle ?? "", entry.excerpt, entry.category, entry.tags.join(" ")]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    })
    .sort((left, right) => getSortValue(right) - getSortValue(left));
}

async function loadArchiveEntries() {
  const notes = await getAllMarkdownNotes();
  const posts = notes.filter((note) => note.relativePath.startsWith("posts/"));
  const lookup = buildMarkdownLookup(notes);

  const entries = await Promise.all(
    posts.map(async (post) => {
      const frontmatter = post.data as MarkdownFrontmatter;
      const slug = frontmatter.slug?.trim() || post.basename;
      const publishedAt = asDateString(frontmatter.publishedAt, new Date().toISOString());
      const compiled = await compileMarkdown(post.content, {
        currentFile: post.absolutePath,
        noteIndex: lookup
      });

      return {
        id: inferId(post.absolutePath),
        ref: getRef(frontmatter, slug),
        slug,
        title: frontmatter.title?.trim() || slug,
        subtitle: frontmatter.subtitle?.trim() || undefined,
        excerpt: getExcerpt(frontmatter, compiled.paragraphs),
        body: compiled.paragraphs,
        markdown: post.content,
        html: compiled.html,
        plainText: compiled.plainText,
        wordCount: compiled.wordCount,
        quote: frontmatter.quote?.trim() || undefined,
        type: frontmatter.type ?? "essay",
        category: frontmatter.category?.trim() || "Notes",
        tags: asStringArray(frontmatter.tags),
        publishedAt,
        year: new Date(publishedAt).getFullYear(),
        sourcePath: post.absolutePath,
        soundtrackTitle: frontmatter.soundtrackTitle?.trim() || undefined,
        soundtrackArtist: frontmatter.soundtrackArtist?.trim() || undefined,
        soundtrackService: frontmatter.soundtrackService,
        soundtrackUrl: frontmatter.soundtrackUrl?.trim() || undefined,
        soundtrackFallbackSrc: frontmatter.soundtrackFallbackSrc?.trim() || undefined,
        coverImage: frontmatter.coverImage?.trim() || undefined,
        coverAlt: frontmatter.coverAlt?.trim() || undefined,
        featured: Boolean(frontmatter.featured),
        isPublished: frontmatter.isPublished ?? true
      } satisfies ArchiveEntry;
    })
  );

  return entries.filter((entry) => entry.isPublished !== false);
}

function stringifyValue(value: string) {
  return JSON.stringify(value);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function buildFrontmatter(input: Partial<ArchiveEntry> & { body?: string | string[] }) {
  const slug = slugify(input.slug ?? input.title ?? "");
  const title = (input.title ?? "").trim();

  if (!slug || !title) {
    throw new Error("Missing required post fields: slug, title.");
  }

  const type = input.type ?? "essay";
  const category = (input.category ?? "Notes").trim();
  const excerpt = (input.excerpt ?? "").trim();
  const tags = input.tags ?? [];
  const publishedAt = input.publishedAt ?? new Date().toISOString();
  const lines = [
    "---",
    `title: ${stringifyValue(title)}`,
    `slug: ${stringifyValue(slug)}`,
    `ref: ${stringifyValue((input.ref ?? slug.toUpperCase().slice(0, 8)).trim())}`,
    `excerpt: ${stringifyValue(excerpt)}`,
    `type: ${stringifyValue(type)}`,
    `category: ${stringifyValue(category)}`,
    `publishedAt: ${stringifyValue(publishedAt)}`,
    `featured: ${input.featured ? "true" : "false"}`,
    `isPublished: ${input.isPublished === false ? "false" : "true"}`
  ];

  if (input.subtitle?.trim()) lines.push(`subtitle: ${stringifyValue(input.subtitle.trim())}`);
  if (input.quote?.trim()) lines.push(`quote: ${stringifyValue(input.quote.trim())}`);
  if (input.soundtrackTitle?.trim()) lines.push(`soundtrackTitle: ${stringifyValue(input.soundtrackTitle.trim())}`);
  if (input.soundtrackArtist?.trim()) lines.push(`soundtrackArtist: ${stringifyValue(input.soundtrackArtist.trim())}`);
  if (input.soundtrackService?.trim()) lines.push(`soundtrackService: ${stringifyValue(input.soundtrackService.trim())}`);
  if (input.soundtrackUrl?.trim()) lines.push(`soundtrackUrl: ${stringifyValue(input.soundtrackUrl.trim())}`);
  if (input.soundtrackFallbackSrc?.trim()) lines.push(`soundtrackFallbackSrc: ${stringifyValue(input.soundtrackFallbackSrc.trim())}`);
  if (input.coverImage?.trim()) lines.push(`coverImage: ${stringifyValue(input.coverImage.trim())}`);
  if (input.coverAlt?.trim()) lines.push(`coverAlt: ${stringifyValue(input.coverAlt.trim())}`);

  if (tags.length > 0) {
    lines.push("tags:");
    for (const tag of tags) {
      lines.push(`  - ${stringifyValue(tag)}`);
    }
  } else {
    lines.push("tags: []");
  }

  lines.push("---");

  return lines.join("\n");
}

function normalizeBody(body: string | string[] | undefined) {
  if (typeof body === "string") return body.trim();
  if (Array.isArray(body)) return body.map((paragraph) => paragraph.trim()).filter(Boolean).join("\n\n");
  return "";
}

export async function getPosts(filters: PostFilters = {}) {
  return applyLocalFilters(await loadArchiveEntries(), filters);
}

export async function getPostBySlug(slug: string) {
  const posts = await loadArchiveEntries();
  return posts.find((entry) => entry.slug === slug) ?? null;
}

export async function createPost(input: Partial<ArchiveEntry> & { body?: string | string[] }) {
  const slug = slugify(input.slug ?? input.title ?? "");
  const title = (input.title ?? "").trim();
  const excerpt = (input.excerpt ?? "").trim();

  if (!slug || !title || !excerpt || !input.type || !input.category) {
    throw new Error("Missing required post fields: slug, title, excerpt, type, category.");
  }

  await fs.mkdir(POSTS_ROOT, { recursive: true });

  const targetPath = path.join(POSTS_ROOT, `${slug}.md`);
  const frontmatter = buildFrontmatter(input);
  const body = normalizeBody(input.body);
  const payload = `${frontmatter}\n\n${body}\n`;

  await fs.writeFile(targetPath, payload, "utf8");

  const post = await getPostBySlug(slug);

  if (!post) {
    throw new Error("Post was written to disk but could not be reloaded.");
  }

  return post;
}
