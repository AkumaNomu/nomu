import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import {
  pageRegistry,
  projectRegistry,
  resourceRegistry,
  toolRegistry,
  writingRegistry,
  type MdxContent,
} from "./content-registry";
import {
  pageSchema,
  projectSchema,
  resourceSchema,
  toolSchema,
  writingSchema,
  type PageFrontmatter,
  type ProjectFrontmatter,
  type ResourceFrontmatter,
  type ToolFrontmatter,
  type WritingFrontmatter,
} from "./content-schema";

export type {
  PageFrontmatter,
  ProjectFrontmatter,
  ResourceFrontmatter,
  ToolFrontmatter,
  WritingFrontmatter,
} from "./content-schema";

type Collection = "writing" | "projects" | "tools" | "pages" | "resources";

export type ContentEntry<T extends object> = T & {
  metadata: T;
  body: string;
  searchableText: string;
  Content: MdxContent;
};

export type WritingEntry = ContentEntry<WritingFrontmatter & { readingTime: string }>;
export type ProjectEntry = ContentEntry<ProjectFrontmatter>;
export type ToolEntry = ContentEntry<ToolFrontmatter>;
export type PageEntry = ContentEntry<PageFrontmatter>;
export type ResourceEntry = ContentEntry<ResourceFrontmatter>;

const contentRoot = (() => {
  const workspacePath = path.join(process.cwd(), "apps", "web", "content");
  return existsSync(workspacePath) ? workspacePath : path.join(process.cwd(), "content");
})();

function readSource(collection: Collection, slug: string) {
  const filePath = path.join(contentRoot, collection, `${slug}.mdx`);
  if (!existsSync(filePath)) throw new Error(`Missing MDX source: ${collection}/${slug}.mdx`);
  const source = readFileSync(filePath, "utf8");
  const parsed = matter(source);
  return { data: parsed.data, body: parsed.content.trim() };
}

function makeSearchText(metadata: object, body: string) {
  return `${Object.values(metadata).flat().join(" ")} ${body}`
    .replace(/[<>#*_`{}\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadWriting(slug: keyof typeof writingRegistry): WritingEntry {
  const { data, body } = readSource("writing", slug);
  const parsed = writingSchema.parse(data);
  if (parsed.slug !== slug) throw new Error(`Writing slug mismatch: ${slug}`);
  const metadata = { ...parsed, readingTime: readingTime(body).text };
  return { ...metadata, metadata, body, searchableText: makeSearchText(metadata, body), Content: writingRegistry[slug] };
}

function loadProject(slug: keyof typeof projectRegistry): ProjectEntry {
  const { data, body } = readSource("projects", slug);
  const metadata = projectSchema.parse(data);
  if (metadata.slug !== slug) throw new Error(`Project slug mismatch: ${slug}`);
  return { ...metadata, metadata, body, searchableText: makeSearchText(metadata, body), Content: projectRegistry[slug] };
}

function loadTool(slug: keyof typeof toolRegistry): ToolEntry {
  const { data, body } = readSource("tools", slug);
  const metadata = toolSchema.parse(data);
  if (metadata.slug !== slug) throw new Error(`Tool slug mismatch: ${slug}`);
  return { ...metadata, metadata, body, searchableText: makeSearchText(metadata, body), Content: toolRegistry[slug] };
}

function loadPage(slug: keyof typeof pageRegistry): PageEntry {
  const { data, body } = readSource("pages", slug);
  const metadata = pageSchema.parse(data);
  if (metadata.slug !== slug) throw new Error(`Page slug mismatch: ${slug}`);
  return { ...metadata, metadata, body, searchableText: makeSearchText(metadata, body), Content: pageRegistry[slug] };
}

function loadResource(slug: keyof typeof resourceRegistry): ResourceEntry {
  const { data, body } = readSource("resources", slug);
  const metadata = resourceSchema.parse(data);
  if (metadata.slug !== slug) throw new Error(`Resource slug mismatch: ${slug}`);
  return { ...metadata, metadata, body, searchableText: makeSearchText(metadata, body), Content: resourceRegistry[slug] };
}

export const writingSlugs = Object.keys(writingRegistry) as Array<keyof typeof writingRegistry>;
export const projectSlugs = Object.keys(projectRegistry) as Array<keyof typeof projectRegistry>;
export const toolSlugs = Object.keys(toolRegistry) as Array<keyof typeof toolRegistry>;
export const pageSlugs = Object.keys(pageRegistry) as Array<keyof typeof pageRegistry>;
export const resourceSlugs = Object.keys(resourceRegistry) as Array<keyof typeof resourceRegistry>;

export function getAllWriting({ includeDrafts = false }: { includeDrafts?: boolean } = {}) {
  return writingSlugs.map(loadWriting)
    .filter((entry) => includeDrafts || !entry.metadata.draft)
    .sort((a, b) => b.metadata.publishedAt.localeCompare(a.metadata.publishedAt));
}

export function getWritingBySlug(slug: string) {
  return Object.hasOwn(writingRegistry, slug) ? loadWriting(slug as keyof typeof writingRegistry) : undefined;
}

export function getAllProjects() {
  return projectSlugs.map(loadProject).sort((a, b) => b.metadata.year - a.metadata.year);
}

export function getProjectBySlug(slug: string) {
  return Object.hasOwn(projectRegistry, slug) ? loadProject(slug as keyof typeof projectRegistry) : undefined;
}

export function getAllTools() {
  return toolSlugs.map(loadTool);
}

export function getToolBySlug(slug: string) {
  return Object.hasOwn(toolRegistry, slug) ? loadTool(slug as keyof typeof toolRegistry) : undefined;
}

export function getPage(slug: string) {
  return Object.hasOwn(pageRegistry, slug) ? loadPage(slug as keyof typeof pageRegistry) : undefined;
}

export function getAllResources() {
  return resourceSlugs.map(loadResource).sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));
}

export function getResourceBySlug(slug: string) {
  return Object.hasOwn(resourceRegistry, slug) ? loadResource(slug as keyof typeof resourceRegistry) : undefined;
}

export const getWritingSlugs = () => [...writingSlugs];
export const getProjectSlugs = () => [...projectSlugs];
export const getToolSlugs = () => [...toolSlugs];
export const getPageSlugs = () => [...pageSlugs];
export const getResourceSlugs = () => [...resourceSlugs];
