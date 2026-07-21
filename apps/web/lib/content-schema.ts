import { z } from "zod";

const slug = z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase, kebab-case slug");
const date = z.string().date();
const optionalUrl = z.url().optional();

export const writingSchema = z.object({
  title: z.string().min(1),
  slug,
  description: z.string().min(1),
  publishedAt: date,
  updatedAt: date.optional(),
  category: z.string().min(1),
  tags: z.array(z.string().min(1)),
  featured: z.boolean().optional(),
  draft: z.boolean().optional(),
  readingTime: z.string().optional(),
  cover: z.string().startsWith("/covers/"),
}).strict();

export const projectSchema = z.object({
  title: z.string().min(1),
  slug,
  description: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  status: z.enum(["planning", "building", "shipped", "paused", "archived"]),
  role: z.string().min(1).optional(),
  technologies: z.array(z.string().min(1)),
  icon: z.string().startsWith("/project-icons/"),
  featured: z.boolean().optional(),
  repository: optionalUrl,
  website: optionalUrl,
}).strict();

export const toolSchema = z.object({
  title: z.string().min(1),
  slug,
  description: z.string().min(1),
  status: z.enum(["live", "experimental", "paused"]),
  featured: z.boolean().optional(),
  category: z.string().min(1),
}).strict();

export const pageSchema = z.object({
  title: z.string().min(1),
  slug,
  description: z.string().min(1),
  navLabel: z.string().min(1).optional(),
}).strict();

export const resourceSchema = z.object({
  title: z.string().min(1),
  slug,
  description: z.string().min(1),
  type: z.enum(["guide", "site"]),
  url: z.url(),
  featured: z.boolean().optional(),
}).strict();

export type WritingFrontmatter = z.infer<typeof writingSchema>;
export type ProjectFrontmatter = z.infer<typeof projectSchema>;
export type ToolFrontmatter = z.infer<typeof toolSchema>;
export type PageFrontmatter = z.infer<typeof pageSchema>;
export type ResourceFrontmatter = z.infer<typeof resourceSchema>;
