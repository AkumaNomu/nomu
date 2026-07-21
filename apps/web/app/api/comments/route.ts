import { NextResponse } from "next/server";
import { z } from "zod";
import { commentsDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const slugSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/);
const commentSchema = z.object({
  slug: slugSchema,
  body: z.string().trim().min(1).max(2000),
  parentId: z.string().uuid().nullable().optional(),
});

type CommentRow = {
  id: string;
  slug: string;
  parent_id: string | null;
  author: string;
  body: string;
  created_at: string;
};

function unavailable() {
  return NextResponse.json(
    { error: "Comments backend is not configured. Add DATABASE_URL and run db/schema.sql." },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  if (!commentsDb) return unavailable();

  const slugResult = slugSchema.safeParse(new URL(request.url).searchParams.get("slug") ?? "");
  if (!slugResult.success) {
    return NextResponse.json({ error: "A valid post slug is required." }, { status: 400 });
  }

  try {
    const rows = await commentsDb`
      SELECT id, slug, parent_id, author, body, created_at
      FROM public.comments
      WHERE slug = ${slugResult.data}
      ORDER BY created_at ASC
    ` as CommentRow[];
    return NextResponse.json({ comments: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load comments." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!commentsDb) return unavailable();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Log in to comment." }, { status: 401 });

  let parsed: z.infer<typeof commentSchema>;
  try {
    parsed = commentSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "A comment and post slug are required." }, { status: 400 });
  }

  try {
    if (parsed.parentId) {
      const parentRows = await commentsDb`
        SELECT slug FROM public.comments WHERE id = ${parsed.parentId} LIMIT 1
      ` as { slug: string }[];
      if (parentRows[0]?.slug !== parsed.slug) {
        return NextResponse.json({ error: "Reply target was not found." }, { status: 400 });
      }
    }

    const rows = await commentsDb`
      INSERT INTO public.comments (slug, parent_id, author, body, user_id)
      VALUES (${parsed.slug}, ${parsed.parentId ?? null}, ${user.username}, ${parsed.body}, ${user.id})
      RETURNING id, slug, parent_id, author, body, created_at
    ` as CommentRow[];
    return NextResponse.json({ comment: rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to save comment." }, { status: 500 });
  }
}
