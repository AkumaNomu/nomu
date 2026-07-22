import { NextResponse } from "next/server";
import { z } from "zod";
import { commentsDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Db = NonNullable<typeof commentsDb>;

const slugSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/);
const reactionSchema = z.object({ reaction: z.union([z.literal(1), z.literal(-1), z.null()]) });

function unavailable() {
  return NextResponse.json(
    { error: "Reactions backend is not configured. Add DATABASE_URL and run db/reactions-schema.sql." },
    { status: 503 },
  );
}

async function counts(db: Db, slug: string) {
  const rows = await db`
    SELECT
      count(*) FILTER (WHERE reaction = 1)::int AS likes,
      count(*) FILTER (WHERE reaction = -1)::int AS dislikes
    FROM public.post_reactions
    WHERE slug = ${slug}
  ` as { likes: number; dislikes: number }[];
  return rows[0] ?? { likes: 0, dislikes: 0 };
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const db = commentsDb;
  if (!db) return unavailable();
  const { slug: rawSlug } = await params;
  const slugResult = slugSchema.safeParse(rawSlug);
  if (!slugResult.success) return NextResponse.json({ error: "A valid post slug is required." }, { status: 400 });

  try {
    const user = await getCurrentUser();
    const totals = await counts(db, slugResult.data);
    let userReaction: number | null = null;
    if (user) {
      const mine = await db`SELECT reaction FROM public.post_reactions WHERE slug = ${slugResult.data} AND user_id = ${user.id} LIMIT 1` as { reaction: number }[];
      userReaction = mine[0]?.reaction ?? null;
    }
    return NextResponse.json({ ...totals, userReaction }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load reactions." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const db = commentsDb;
  if (!db) return unavailable();
  const { slug: rawSlug } = await params;
  const slugResult = slugSchema.safeParse(rawSlug);
  if (!slugResult.success) return NextResponse.json({ error: "A valid post slug is required." }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Log in to react to posts." }, { status: 401 });

  let parsed: z.infer<typeof reactionSchema>;
  try {
    parsed = reactionSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "A reaction of 1, -1, or null is required." }, { status: 400 });
  }

  try {
    if (parsed.reaction === null) {
      await db`DELETE FROM public.post_reactions WHERE slug = ${slugResult.data} AND user_id = ${user.id}`;
    } else {
      await db`
        INSERT INTO public.post_reactions (slug, user_id, reaction)
        VALUES (${slugResult.data}, ${user.id}, ${parsed.reaction})
        ON CONFLICT (slug, user_id) DO UPDATE SET reaction = EXCLUDED.reaction, created_at = now()
      `;
    }
    const totals = await counts(db, slugResult.data);
    return NextResponse.json({ ...totals, userReaction: parsed.reaction });
  } catch {
    return NextResponse.json({ error: "Unable to save reaction." }, { status: 500 });
  }
}
