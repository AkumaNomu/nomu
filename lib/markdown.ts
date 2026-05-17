import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { toString } from "mdast-util-to-string";
import remarkBreaks from "remark-breaks";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Blockquote, Paragraph, Root, Text } from "mdast";

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

export const CONTENT_ROOT = path.join(process.cwd(), "content");
export const POSTS_ROOT = path.join(CONTENT_ROOT, "posts");
const PUBLIC_ROOT = path.join(process.cwd(), "public");

export type RawMarkdownNote = {
  absolutePath: string;
  relativePath: string;
  basename: string;
  data: Record<string, unknown>;
  content: string;
};

export type MarkdownLookupEntry = {
  absolutePath: string;
  relativePath: string;
  slug: string;
  title: string;
  type?: string;
};

type CompileContext = {
  currentFile: string;
  noteIndex: Map<string, MarkdownLookupEntry>;
  sourceByPath?: Map<string, string>;
};

export type CompiledMarkdown = {
  html: string;
  plainText: string;
  paragraphs: string[];
  wordCount: number;
};

type ParsedReference = {
  raw: string;
  target: string;
  alias?: string;
  section?: string;
};

function normalizeLookupKey(value: string) {
  return value.replace(/\\/g, "/").replace(/\.[^.]+$/, "").trim().toLowerCase();
}

function slugifyFragment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`~!@#$%^&*()+=[\]{}|;:'",.<>/?\\]/g, "")
    .replace(/\s+/g, "-");
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function escapeMarkdownText(value: string) {
  return value.replace(/[\\[\]]/g, "\\$&");
}

function stripObsidianComments(source: string) {
  return source.replace(/%%[\s\S]*?%%/g, "");
}

function replaceHighlights(source: string) {
  return source.replace(/==([^=\n][\s\S]*?[^=\n])==/g, "<mark>$1</mark>");
}

function parseReference(rawReference: string): ParsedReference {
  const [rawTarget, rawAlias] = rawReference.split("|");
  const trimmedTarget = rawTarget.trim();

  if (trimmedTarget.startsWith("#")) {
    return {
      raw: rawReference,
      target: "",
      section: trimmedTarget.slice(1).trim(),
      alias: rawAlias?.trim()
    };
  }

  const [target, section] = trimmedTarget.split("#");

  return {
    raw: rawReference,
    target: target.trim(),
    section: section?.trim(),
    alias: rawAlias?.trim()
  };
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectMarkdownFiles(root: string) {
  const results: string[] = [];

  async function walk(current: string) {
    if (!(await pathExists(current))) return;

    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (MARKDOWN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        results.push(absolutePath);
      }
    }
  }

  await walk(root);

  return results.sort((left, right) => left.localeCompare(right));
}

export async function getAllMarkdownNotes() {
  const files = await collectMarkdownFiles(CONTENT_ROOT);

  const notes = await Promise.all(
    files.map(async (absolutePath) => {
      const source = await fs.readFile(absolutePath, "utf8");
      const parsed = matter(source);

      return {
        absolutePath,
        relativePath: path.relative(CONTENT_ROOT, absolutePath).replace(/\\/g, "/"),
        basename: path.basename(absolutePath, path.extname(absolutePath)),
        data: parsed.data,
        content: parsed.content.trim()
      } satisfies RawMarkdownNote;
    })
  );

  return notes;
}

export function buildMarkdownLookup(notes: RawMarkdownNote[]) {
  const lookup = new Map<string, MarkdownLookupEntry>();

  for (const note of notes) {
    const slug = String(note.data.slug ?? note.basename);
    const title = String(note.data.title ?? note.basename);
    const entry = {
      absolutePath: note.absolutePath,
      relativePath: note.relativePath,
      slug,
      title,
      type: typeof note.data.type === "string" ? note.data.type : undefined
    } satisfies MarkdownLookupEntry;

    for (const key of [
      slug,
      title,
      note.basename,
      note.relativePath,
      note.relativePath.replace(/\.[^.]+$/, "")
    ]) {
      lookup.set(normalizeLookupKey(key), entry);
    }
  }

  return lookup;
}

function getEntryHref(entry: MarkdownLookupEntry, section?: string) {
  const prefix = entry.type === "fragment" ? "/fragments" : "/writing";
  const anchor = section ? `#${slugifyFragment(section)}` : "";
  return `${prefix}/${entry.slug}${anchor}`;
}

function encodeAssetSegments(relativePath: string) {
  return relativePath
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function resolveAssetHref(target: string, currentFile: string) {
  if (!target) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(target)) return target;
  if (target.startsWith("/")) return target;

  const candidates = [
    path.resolve(path.dirname(currentFile), target),
    path.resolve(CONTENT_ROOT, target),
    path.resolve(PUBLIC_ROOT, target)
  ];

  for (const candidate of candidates) {
    if (!(await pathExists(candidate))) continue;

    if (candidate.startsWith(PUBLIC_ROOT)) {
      const publicPath = path.relative(PUBLIC_ROOT, candidate).replace(/\\/g, "/");
      return `/${publicPath}`;
    }

    if (candidate.startsWith(CONTENT_ROOT)) {
      const relativePath = path.relative(CONTENT_ROOT, candidate).replace(/\\/g, "/");
      return `/api/content-assets/${encodeAssetSegments(relativePath)}`;
    }
  }

  return null;
}

async function resolveReference(reference: ParsedReference, context: CompileContext) {
  if (!reference.target && reference.section) {
    return {
      kind: "link" as const,
      href: `#${slugifyFragment(reference.section)}`,
      label: reference.alias ?? reference.section
    };
  }

  if (/^(https?:\/\/|mailto:|tel:)/i.test(reference.target)) {
    return {
      kind: "link" as const,
      href: reference.target,
      label: reference.alias ?? reference.target
    };
  }

  const normalized = normalizeLookupKey(reference.target);
  const matchedEntry = context.noteIndex.get(normalized);

  if (matchedEntry) {
    return {
      kind: "entry" as const,
      href: getEntryHref(matchedEntry, reference.section),
      label: reference.alias ?? matchedEntry.title,
      absolutePath: matchedEntry.absolutePath
    };
  }

  const assetHref = await resolveAssetHref(reference.target, context.currentFile);

  if (assetHref) {
    return {
      kind: "asset" as const,
      href: assetHref,
      label: reference.alias ?? path.basename(reference.target)
    };
  }

  return null;
}

function extractMarkdownSection(source: string, section?: string) {
  if (!section) return source.trim();

  const lines = source.split(/\r?\n/);
  const headingPattern = /^(#{1,6})\s+(.*)$/;
  let start = -1;
  let level = 7;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(headingPattern);
    if (!match) continue;

    if (match[2].trim().toLowerCase() === section.toLowerCase()) {
      start = index + 1;
      level = match[1].length;
      break;
    }
  }

  if (start === -1) return source.trim();

  let end = lines.length;

  for (let index = start; index < lines.length; index += 1) {
    const match = lines[index].match(headingPattern);
    if (match && match[1].length <= level) {
      end = index;
      break;
    }
  }

  return lines.slice(start, end).join("\n").trim();
}

async function expandEmbeds(source: string, context: CompileContext, seen = new Set<string>()): Promise<string> {
  const embedPattern = /!\[\[([^[\]]+?)\]\]/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = embedPattern.exec(source)) !== null) {
    result += source.slice(lastIndex, match.index);
    lastIndex = match.index + match[0].length;

    const reference = parseReference(match[1]);
    const resolved = await resolveReference(reference, context);

    if (!resolved) {
      result += match[0];
      continue;
    }

    if (resolved.kind === "entry" && resolved.absolutePath) {
      if (seen.has(resolved.absolutePath)) {
        result += "";
        continue;
      }

      const embeddedSource = context.sourceByPath?.get(resolved.absolutePath) ?? (await fs.readFile(resolved.absolutePath, "utf8"));
      const embedded = matter(embeddedSource);
      const sectionContent = extractMarkdownSection(embedded.content, reference.section);
      const expanded = await expandEmbeds(
        sectionContent,
        { ...context, currentFile: resolved.absolutePath },
        new Set([...seen, resolved.absolutePath])
      );

      result += `\n\n${expanded}\n\n`;
      continue;
    }

    if (resolved.kind === "asset") {
      const label = escapeMarkdownText(resolved.label);
      result += `![${label}](${resolved.href})`;
      continue;
    }

    result += match[0];
  }

  result += source.slice(lastIndex);

  return result;
}

async function replaceWikiLinks(source: string, context: CompileContext) {
  const wikiPattern = /\[\[([^[\]]+?)\]\]/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = wikiPattern.exec(source)) !== null) {
    result += source.slice(lastIndex, match.index);
    lastIndex = match.index + match[0].length;

    const reference = parseReference(match[1]);
    const resolved = await resolveReference(reference, context);

    if (!resolved) {
      result += reference.alias ?? reference.target ?? match[0];
      continue;
    }

    const label = escapeMarkdownText(resolved.label);
    result += `[${label}](${resolved.href})`;
  }

  result += source.slice(lastIndex);

  return result;
}

async function preprocessMarkdown(source: string, context: CompileContext) {
  const withoutComments = stripObsidianComments(source);
  const expandedEmbeds = await expandEmbeds(withoutComments, context, new Set([context.currentFile]));
  const withWikiLinks = await replaceWikiLinks(expandedEmbeds, context);
  return replaceHighlights(withWikiLinks);
}

function remarkObsidianCallouts() {
  return (tree: Root) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== "paragraph") return;

      const paragraph = firstChild as Paragraph;
      const text = toString(paragraph).trim();
      const match = text.match(/^\[!([a-z0-9-]+)\]([+-])?\s*(.*)$/i);

      if (!match) return;

      const [, rawType, foldState, rawTitle] = match;
      const title = rawTitle.trim() || rawType.replace(/-/g, " ");
      const titleNode = paragraph.children[0];

      if (titleNode && titleNode.type === "text") {
        (titleNode as Text).value = title;
        paragraph.children = [titleNode];
      } else {
        paragraph.children = [{ type: "text", value: title } as Text];
      }

      const calloutType = rawType.toLowerCase();

      (node.data ??= {}).hName = "div";
      (node.data ??= {}).hProperties = {
        className: ["obsidian-callout", `obsidian-callout-${calloutType}`],
        "data-callout": calloutType,
        "data-foldable": foldState ? "true" : "false",
        "data-open": foldState === "-" ? "false" : "true"
      };

      (paragraph.data ??= {}).hProperties = {
        className: ["obsidian-callout-title"]
      };
    });
  };
}

function paragraphizePlainText(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+\n/g, " ").replace(/\n+/g, " ").trim())
    .filter(Boolean);
}

export async function compileMarkdown(source: string, context: CompileContext): Promise<CompiledMarkdown> {
  const transformed = await preprocessMarkdown(source, context);

  const markdownTree = unified().use(remarkParse).parse(transformed) as Root;
  const plainText = toString(markdownTree).replace(/\n{3,}/g, "\n\n").trim();

  const file = await unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkDirective)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkBreaks)
    .use(remarkObsidianCallouts)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex)
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(transformed);

  return {
    html: String(file),
    plainText,
    paragraphs: paragraphizePlainText(plainText),
    wordCount: countWords(plainText)
  };
}
