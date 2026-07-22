import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import {
  blogRegistry,
  pageRegistry,
  projectRegistry,
  resourceRegistry,
  toolRegistry,
  type MdxContent,
} from "./content-registry";
import {
  blogSchema,
  pageSchema,
  projectSchema,
  resourceSchema,
  toolSchema,
  type BlogFrontmatter,
  type PageFrontmatter,
  type ProjectFrontmatter,
  type ResourceFrontmatter,
  type ToolFrontmatter,
} from "./content-schema";

export type {
  BlogFrontmatter,
  PageFrontmatter,
  ProjectFrontmatter,
  ResourceFrontmatter,
  ToolFrontmatter,
} from "./content-schema";

type Collection = "blog" | "projects" | "tools" | "pages" | "resources";

export type ContentEntry<T extends object> = T & {
  metadata: T;
  body: string;
  searchableText: string;
  Content: MdxContent;
};

export type BlogEntry = ContentEntry<BlogFrontmatter & { readingTime: string }>;
export type ProjectEntry = ContentEntry<ProjectFrontmatter>;
export type ToolEntry = ContentEntry<ToolFrontmatter>;
export type PageEntry = ContentEntry<PageFrontmatter>;
export type ResourceEntry = ContentEntry<ResourceFrontmatter>;

const contentRoot = (() => {
  const workspacePath = path.join(process.cwd(), "apps", "web", "content");
  return existsSync(workspacePath) ? workspacePath : path.join(process.cwd(), "content");
})();

const publicRoot = (() => {
  const workspacePath = path.join(process.cwd(), "apps", "web", "public");
  return existsSync(workspacePath) ? workspacePath : path.join(process.cwd(), "public");
})();

// Screenshots for a project's gallery: every image dropped into
// public/projects/<slug>/ except the cover (already shown as the header icon
// and the lead figure). Returns [] when the folder has no extra shots, so the
// gallery only renders once real screenshots exist.
export function getProjectImages(slug: string): string[] {
  const dir = path.join(publicRoot, "projects", slug);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => /\.(png|jpe?g|webp|avif)$/i.test(file) && !/^cover\./i.test(file))
    .sort()
    .map((file) => `/projects/${slug}/${file}`);
}

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

function loadBlog(slug: keyof typeof blogRegistry): BlogEntry {
  const { data, body } = readSource("blog", slug);
  const parsed = blogSchema.parse(data);
  if (parsed.slug !== slug) throw new Error(`Blog slug mismatch: ${slug}`);
  const metadata = { ...parsed, readingTime: readingTime(body).text };
  return { ...metadata, metadata, body, searchableText: makeSearchText(metadata, body), Content: blogRegistry[slug] };
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

export const blogSlugs = Object.keys(blogRegistry) as Array<keyof typeof blogRegistry>;
export const projectSlugs = Object.keys(projectRegistry) as Array<keyof typeof projectRegistry>;
export const toolSlugs = Object.keys(toolRegistry) as Array<keyof typeof toolRegistry>;
export const pageSlugs = Object.keys(pageRegistry) as Array<keyof typeof pageRegistry>;
export const resourceSlugs = Object.keys(resourceRegistry) as Array<keyof typeof resourceRegistry>;

export function getAllBlog({ includeDrafts = false }: { includeDrafts?: boolean } = {}) {
  return blogSlugs.map(loadBlog)
    .filter((entry) => includeDrafts || !entry.metadata.draft)
    .sort((a, b) => b.metadata.publishedAt.localeCompare(a.metadata.publishedAt));
}

export function getBlogBySlug(slug: string) {
  return Object.hasOwn(blogRegistry, slug) ? loadBlog(slug as keyof typeof blogRegistry) : undefined;
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

export const getBlogSlugs = () => [...blogSlugs];
export const getProjectSlugs = () => [...projectSlugs];
export const getToolSlugs = () => [...toolSlugs];
export const getPageSlugs = () => [...pageSlugs];
export const getResourceSlugs = () => [...resourceSlugs];
