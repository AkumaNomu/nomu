import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getCurrentUser } from "@/lib/auth";
import { commentsDb } from "@/lib/db";
import { blogSchema, projectSchema, toolSchema } from "@/lib/content-schema";

export type AdminContentCollection = "blog" | "projects";
type ReadableCollection = AdminContentCollection | "tools";

type BlogMetadata = typeof blogSchema._output;
type ProjectMetadata = typeof projectSchema._output;
type ToolMetadata = typeof toolSchema._output;

export type AdminContentEntry = {
  slug: string;
  fileName: string;
  updatedAt: string;
  body: string;
  metadata: BlogMetadata | ProjectMetadata;
};

export type AdminToolEntry = {
  slug: string;
  name: string;
  description: string;
  status: "Live" | "Experimental" | "Paused";
  category: string;
  icon: string;
  hasContentFile: boolean;
  contentStatus: ToolMetadata["status"] | null;
};

type AdminToolSourceEntry = {
  slug: string;
  name: string;
  description: string;
  status: AdminToolEntry["status"];
  category: string;
  icon: string;
};

const CONTENT_ROOT = (() => {
  const workspacePath = path.join(process.cwd(), "apps", "web", "content");
  return existsSync(workspacePath) ? workspacePath : path.join(process.cwd(), "content");
})();

const TOOL_DATA_PATH = (() => {
  const workspacePath = path.join(process.cwd(), "apps", "web", "app", "tools", "tools-data.ts");
  return existsSync(workspacePath) ? workspacePath : path.join(process.cwd(), "app", "tools", "tools-data.ts");
})();

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!commentsDb) throw new Error("Database not configured");

  const rows = await commentsDb`
    SELECT is_admin FROM public.users WHERE id = ${user.id}
  ` as { is_admin: boolean }[];

  if (!rows[0]?.is_admin) throw new Error("Admin access required");
  return user;
}

export function adminErrorStatus(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message.includes("Admin access required")) return 403;
  if (error.message.includes("Unauthorized")) return 401;
  if (error.message.includes("not found")) return 404;
  if (error.message.includes("Invalid")) return 400;
  return 500;
}

function getCollectionPath(collection: ReadableCollection) {
  return path.join(CONTENT_ROOT, collection);
}

function getContentFilePath(collection: ReadableCollection, slug: string) {
  return path.join(getCollectionPath(collection), `${slug}.mdx`);
}

export async function listContentEntries(collection: AdminContentCollection) {
  const dir = getCollectionPath(collection);
  const files = (await readdir(dir)).filter((file) => file.endsWith(".mdx")).sort();

  const entries = await Promise.all(files.map(async (fileName) => {
    const filePath = path.join(dir, fileName);
    const [source, fileStat] = await Promise.all([readFile(filePath, "utf8"), stat(filePath)]);
    const parsed = matter(source);
    const metadata = collection === "blog"
      ? blogSchema.parse(parsed.data)
      : projectSchema.parse(parsed.data);

    return {
      slug: metadata.slug,
      fileName,
      updatedAt: fileStat.mtime.toISOString(),
      body: parsed.content.trim(),
      metadata,
    } satisfies AdminContentEntry;
  }));

  return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function updateContentEntry(
  collection: AdminContentCollection,
  slug: string,
  next: { metadata: BlogMetadata | ProjectMetadata; body: string },
) {
  const filePath = getContentFilePath(collection, slug);
  if (!existsSync(filePath)) throw new Error(`${collection}:${slug} not found`);
  if (next.metadata.slug !== slug) throw new Error("Invalid slug change");

  const metadata = collection === "blog"
    ? blogSchema.parse(next.metadata)
    : projectSchema.parse(next.metadata);

  const source = matter.stringify(next.body.trim(), metadata);
  await writeFile(filePath, `${source.trimEnd()}\n`, "utf8");

  return {
    slug,
    body: next.body.trim(),
    metadata,
  };
}

export async function createContentEntry(
  collection: AdminContentCollection,
  next: { metadata: BlogMetadata | ProjectMetadata; body: string },
) {
  const metadata = collection === "blog"
    ? blogSchema.parse(next.metadata)
    : projectSchema.parse(next.metadata);

  const filePath = getContentFilePath(collection, metadata.slug);
  if (existsSync(filePath)) throw new Error(`${collection}:${metadata.slug} already exists`);

  const source = matter.stringify(next.body.trim(), metadata);
  await writeFile(filePath, `${source.trimEnd()}\n`, "utf8");

  return {
    slug: metadata.slug,
    body: next.body.trim(),
    metadata,
  };
}

export async function readToolEntries() {
  const source = await readFile(TOOL_DATA_PATH, "utf8");
  const entries = parseToolDataSource(source);

  const toolsWithContent = await Promise.all(entries.map(async (entry) => {
    const filePath = getContentFilePath("tools", entry.slug);
    if (!existsSync(filePath)) {
      return {
        ...entry,
        hasContentFile: false,
        contentStatus: null,
      } satisfies AdminToolEntry;
    }

    const parsed = matter(await readFile(filePath, "utf8"));
    const metadata = toolSchema.parse(parsed.data);
    return {
      ...entry,
      hasContentFile: true,
      contentStatus: metadata.status,
    } satisfies AdminToolEntry;
  }));

  return toolsWithContent;
}

function parseToolDataSource(source: string) {
  return (source.match(/\{[^{}]+\}/g) ?? []).map((block) => {
    const read = (key: string) => {
      const match = block.match(new RegExp(`${key}:\\s*"([^"]+)"`));
      if (!match) throw new Error(`Invalid tools-data entry: missing ${key}`);
      return match[1];
    };

    return {
      slug: read("slug"),
      name: read("name"),
      description: read("description"),
      status: read("status") as AdminToolSourceEntry["status"],
      category: read("category"),
      icon: read("icon"),
    } satisfies AdminToolSourceEntry;
  });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function updateToolStatus(slug: string, status: AdminToolEntry["status"]) {
  const source = await readFile(TOOL_DATA_PATH, "utf8");
  const objectPattern = new RegExp(`\\{[^{}]*slug:\\s*"${escapeRegex(slug)}"[^{}]*\\}`, "m");
  const objectMatch = source.match(objectPattern);
  if (!objectMatch) throw new Error(`tool:${slug} not found`);

  const updatedObject = objectMatch[0].replace(/status:\s*"[^"]+"/, `status: "${status}"`);
  const updatedSource = source.replace(objectMatch[0], updatedObject);
  await writeFile(TOOL_DATA_PATH, updatedSource, "utf8");

  const filePath = getContentFilePath("tools", slug);
  let contentStatus: ToolMetadata["status"] | null = null;
  if (existsSync(filePath)) {
    const parsed = matter(await readFile(filePath, "utf8"));
    const metadata = toolSchema.parse(parsed.data);
    const nextMetadata = {
      ...metadata,
      status: status.toLowerCase() as ToolMetadata["status"],
    };
    await writeFile(filePath, `${matter.stringify(parsed.content.trim(), nextMetadata).trimEnd()}\n`, "utf8");
    contentStatus = nextMetadata.status;
  }

  return { slug, status, contentStatus };
}

export async function writeAuditLog(input: {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: unknown;
}) {
  if (!commentsDb) return;
  await commentsDb`
    INSERT INTO public.admin_audit (user_id, action, resource_type, resource_id, details)
    VALUES (${input.userId}, ${input.action}, ${input.resourceType}, ${input.resourceId ?? null}, ${input.details ? JSON.stringify(input.details) : null})
  `;
}
