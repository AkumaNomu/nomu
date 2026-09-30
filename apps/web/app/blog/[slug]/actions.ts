"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getBlogBySlug, getBlogSource } from "@/lib/content";
import { blogSchema } from "@/lib/content-schema";
import { mintUnlockCookie, verifyPassword } from "@/lib/postLock";

const attempts = new Map<string, { count: number; resetAt: number }>();

function throttled(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now >= entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10;
}

export async function unlockPost(_prev: string | null, formData: FormData): Promise<string | null> {
  const slug = String(formData.get("slug") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!slug || !password || password.length > 256) return "Invalid request.";

  const entry = getBlogBySlug(slug);
  if (!entry || entry.metadata.protected !== true) return "Post not found.";

  if (throttled(slug)) return "Too many attempts. Wait a minute and try again.";

  const { data } = getBlogSource(slug);
  let frontmatter;
  try {
    frontmatter = blogSchema.parse(data);
  } catch {
    return "Post is misconfigured.";
  }
  if (!frontmatter.passwordHash || !verifyPassword(password, frontmatter.passwordHash)) {
    return "Wrong password. Try again.";
  }

  const cookie = mintUnlockCookie(slug);
  (await cookies()).set(cookie.name, cookie.value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });
  redirect(`/blog/${slug}`);
}
