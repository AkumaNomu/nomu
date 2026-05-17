import { promises as fs } from "node:fs";
import path from "node:path";
import { buildMarkdownLookup, compileMarkdown, getAllMarkdownNotes, POSTS_ROOT, type RawMarkdownNote } from "@/lib/markdown";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { ArchiveEntry, EntryType, SupabasePostRow } from "@/types/archive";

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

type ContentWriteInput = Partial<ArchiveEntry> & { body?: string | string[] };

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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function stringifyValue(value: string) {
  return JSON.stringify(value);
}

function normalizeBody(body: string | string[] | undefined) {
  if (typeof body === "string") return body.trim();
  if (Array.isArray(body)) return body.map((paragraph) => paragraph.trim()).filter(Boolean).join("\n\n");
  return "";
}

function bodyToArray(body: string | string[] | undefined) {
  if (Array.isArray(body)) return body.map((paragraph) => paragraph.trim()).filter(Boolean);
  if (typeof body === "string") {
    return body
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

  return [];
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

function rowToArchiveEntry(row: SupabasePostRow, sourcePath: string, markdown: string, compiled: Awaited<ReturnType<typeof compileMarkdown>>): ArchiveEntry {
  return {
    id: row.id,
    ref: row.ref?.trim() || row.slug.toUpperCase().slice(0, 8),
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle?.trim() || undefined,
    excerpt: row.excerpt,
    body: compiled.paragraphs,
    markdown,
    html: compiled.html,
    plainText: compiled.plainText,
    wordCount: compiled.wordCount,
    quote: row.quote?.trim() || undefined,
    type: row.type,
    category: row.category,
    tags: row.tags ?? [],
    publishedAt: row.published_at,
    year: new Date(row.published_at).getFullYear(),
    sourcePath,
    soundtrackTitle: row.soundtrack_title?.trim() || undefined,
    soundtrackArtist: row.soundtrack_artist?.trim() || undefined,
    soundtrackService: row.soundtrack_service ?? undefined,
    soundtrackUrl: row.soundtrack_url?.trim() || undefined,
    soundtrackFallbackSrc: row.soundtrack_fallback_src?.trim() || undefined,
    coverImage: row.cover_image?.trim() || undefined,
    coverAlt: row.cover_alt?.trim() || undefined,
    featured: Boolean(row.featured),
    isPublished: Boolean(row.is_published)
  };
}

function toSupabaseRowPayload(input: ContentWriteInput) {
  const slug = slugify(input.slug ?? input.title ?? "");
  const title = (input.title ?? "").trim();

  if (!slug || !title) {
    throw new Error("Missing required post fields: slug, title.");
  }

  return {
    ref: (input.ref ?? slug.toUpperCase().slice(0, 8)).trim(),
    slug,
    title,
    subtitle: input.subtitle?.trim() || null,
    excerpt: (input.excerpt ?? "").trim(),
    body: bodyToArray(input.body),
    quote: input.quote?.trim() || null,
    type: input.type ?? "essay",
    category: (input.category ?? "Notes").trim(),
    tags: input.tags ?? [],
    published_at: asDateString(input.publishedAt, new Date().toISOString()),
    cover_image: input.coverImage?.trim() || null,
    cover_alt: input.coverAlt?.trim() || null,
    soundtrack_title: input.soundtrackTitle?.trim() || null,
    soundtrack_artist: input.soundtrackArtist?.trim() || null,
    soundtrack_service: input.soundtrackService ?? null,
    soundtrack_url: input.soundtrackUrl?.trim() || null,
    soundtrack_fallback_src: input.soundtrackFallbackSrc?.trim() || null,
    featured: Boolean(input.featured),
    is_published: input.isPublished ?? true
  } satisfies Omit<SupabasePostRow, "id" | "created_at" | "updated_at">;
}

async function loadLocalEntries() {
  const notes = await getAllMarkdownNotes();
  const posts = notes.filter((note) => note.relativePath.startsWith("posts/"));
  const lookup = buildMarkdownLookup(notes);
  const sourceByPath = new Map<string, string>(posts.map((post) => [post.absolutePath, post.content]));

  const entries = await Promise.all(
    posts.map(async (post) => {
      const frontmatter = post.data as MarkdownFrontmatter;
      const slug = frontmatter.slug?.trim() || post.basename;
      const publishedAt = asDateString(frontmatter.publishedAt, new Date().toISOString());
      const compiled = await compileMarkdown(post.content, {
        currentFile: post.absolutePath,
        noteIndex: lookup,
        sourceByPath
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

  return entries;
}

async function loadSupabaseEntries(includeUnpublished = false) {
  const client = includeUnpublished ? createAdminSupabaseClient() : createServerSupabaseClient();

  if (!client) return null;

  let query = client
    .from("posts")
    .select("*")
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (!includeUnpublished) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as SupabasePostRow[];
  const syntheticNotes: RawMarkdownNote[] = rows.map((row) => {
    const absolutePath = path.join(POSTS_ROOT, `${row.slug}.md`);
    return {
      absolutePath,
      relativePath: `posts/${row.slug}.md`,
      basename: row.slug,
      data: {
        slug: row.slug,
        title: row.title,
        type: row.type
      },
      content: row.body?.join("\n\n") ?? ""
    };
  });

  const lookup = buildMarkdownLookup(syntheticNotes);
  const sourceByPath = new Map<string, string>(syntheticNotes.map((note) => [note.absolutePath, note.content]));

  const entries = await Promise.all(
    rows.map(async (row) => {
      const sourcePath = path.join(POSTS_ROOT, `${row.slug}.md`);
      const markdown = row.body?.join("\n\n") ?? "";
      const compiled = await compileMarkdown(markdown, {
        currentFile: sourcePath,
        noteIndex: lookup,
        sourceByPath
      });

      return rowToArchiveEntry(row, sourcePath, markdown, compiled);
    })
  );

  return entries;
}

async function loadArchiveEntries(includeUnpublished = false) {
  if (isSupabaseConfigured()) {
    const entries = await loadSupabaseEntries(includeUnpublished);
    if (entries) return entries;
  }

  return loadLocalEntries();
}

function toSupabaseClient() {
  return createAdminSupabaseClient();
}

async function saveLocalPost(slug: string, input: ContentWriteInput, existing?: ArchiveEntry | null) {
  await fs.mkdir(POSTS_ROOT, { recursive: true });

  const nextSlug = slugify(input.slug ?? existing?.slug ?? input.title ?? slug);
  const targetPath = path.join(POSTS_ROOT, `${nextSlug}.md`);
  const frontmatter = buildFrontmatter({
    ...(existing ?? {}),
    ...input,
    slug: nextSlug,
    title: input.title ?? existing?.title ?? nextSlug
  });
  const body = normalizeBody(input.body ?? existing?.markdown);
  const payload = `${frontmatter}\n\n${body}\n`;

  if (existing?.sourcePath && existing.sourcePath !== targetPath) {
    await fs.unlink(existing.sourcePath).catch(() => undefined);
  }

  await fs.writeFile(targetPath, payload, "utf8");

  const post = await getPostBySlug(nextSlug, { includeUnpublished: true });

  if (!post) {
    throw new Error("Post was written to disk but could not be reloaded.");
  }

  return post;
}

async function saveSupabasePost(slug: string, input: ContentWriteInput, existing?: ArchiveEntry | null) {
  const client = toSupabaseClient();
  if (!client) {
    throw new Error("Supabase admin client is not configured.");
  }

  const nextSlug = slugify(input.slug ?? existing?.slug ?? input.title ?? slug);
  const payload = toSupabaseRowPayload({
    ...(existing ?? {}),
    ...input,
    slug: nextSlug,
    title: input.title ?? existing?.title ?? nextSlug
  });

  const action = existing
    ? client.from("posts").update(payload).eq("slug", slug).select("*").single()
    : client.from("posts").insert(payload).select("*").single();

  const { data, error } = await action;

  if (error) {
    throw new Error(error.message);
  }

  const row = data as SupabasePostRow | null;
  if (!row) {
    throw new Error("Supabase did not return the saved post.");
  }

  const markdown = row.body?.join("\n\n") ?? "";
  const sourcePath = path.join(POSTS_ROOT, `${row.slug}.md`);
  const syntheticNotes: RawMarkdownNote[] = [
    {
      absolutePath: sourcePath,
      relativePath: `posts/${row.slug}.md`,
      basename: row.slug,
      data: { slug: row.slug, title: row.title, type: row.type },
      content: markdown
    }
  ];
  const lookup = buildMarkdownLookup(syntheticNotes);
  const sourceByPath = new Map<string, string>([[sourcePath, markdown]]);
  const compiled = await compileMarkdown(markdown, {
    currentFile: sourcePath,
    noteIndex: lookup,
    sourceByPath
  });

  return rowToArchiveEntry(row, sourcePath, markdown, compiled);
}

async function deleteLocalPost(slug: string) {
  const targetPath = path.join(POSTS_ROOT, `${slug}.md`);
  await fs.unlink(targetPath).catch(() => undefined);
  return true;
}

async function deleteSupabasePost(slug: string) {
  const client = toSupabaseClient();
  if (!client) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { error } = await client.from("posts").delete().eq("slug", slug);
  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function getPosts(filters: PostFilters = {}, options: { includeUnpublished?: boolean } = {}) {
  const entries = await loadArchiveEntries(Boolean(options.includeUnpublished));
  return applyLocalFilters(entries, filters);
}

export async function getPostBySlug(slug: string, options: { includeUnpublished?: boolean } = {}) {
  const posts = await loadArchiveEntries(Boolean(options.includeUnpublished));
  return posts.find((entry) => entry.slug === slug) ?? null;
}

export async function createPost(input: ContentWriteInput) {
  const slug = slugify(input.slug ?? input.title ?? "");
  const title = (input.title ?? "").trim();
  const excerpt = (input.excerpt ?? "").trim();

  if (!slug || !title || !excerpt || !input.type || !input.category) {
    throw new Error("Missing required post fields: slug, title, excerpt, type, category.");
  }

  if (isSupabaseConfigured()) {
    if (!toSupabaseClient()) {
      throw new Error("Supabase admin client is not configured.");
    }
    return saveSupabasePost(slug, input);
  }

  return saveLocalPost(slug, input);
}

export async function updatePost(slug: string, input: ContentWriteInput) {
  if (isSupabaseConfigured() && !toSupabaseClient()) {
    throw new Error("Supabase admin client is not configured.");
  }

  const existing = await getPostBySlug(slug, { includeUnpublished: true });

  if (!existing) {
    throw new Error("Post not found.");
  }

  const merged = {
    ...existing,
    ...input,
    body: input.body ?? existing.markdown
  } as ContentWriteInput;

  if (isSupabaseConfigured()) {
    return saveSupabasePost(slug, merged, existing);
  }

  return saveLocalPost(slug, merged, existing);
}

export async function deletePost(slug: string) {
  if (isSupabaseConfigured()) {
    if (!toSupabaseClient()) {
      throw new Error("Supabase admin client is not configured.");
    }
    return deleteSupabasePost(slug);
  }

  return deleteLocalPost(slug);
}
