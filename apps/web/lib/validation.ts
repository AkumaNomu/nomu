import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be 3–24 characters")
  .max(24)
  .regex(/^[a-z0-9_]+$/, "Username: letters, numbers, underscores only");

export const passwordSchema = z
  .string()
  .min(8, "Password must be 8–100 characters")
  .max(100);

export const commentSchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "Invalid slug"),
  body: z.string().trim().min(1, "Comment required").max(2000),
  parentId: z.string().uuid().nullable().optional(),
});

export const musicSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().min(1).max(200),
  album: z.string().trim().min(1).max(200),
  file_path: z.string().url().or(z.string().startsWith("/")),
  artwork_path: z.string().url().or(z.string().startsWith("/")).nullable().optional(),
  duration_ms: z.number().positive().nullable().optional(),
});

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}

export function sanitizeComment(text: string): string {
  return sanitizeHtml(text).trim();
}
