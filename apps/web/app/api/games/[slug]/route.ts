import { NextResponse } from "next/server";
import { commentsDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!commentsDb) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const rows = await commentsDb`
    SELECT id, title, slug, description, thumbnail_path, file_path
    FROM public.games
    WHERE slug = ${slug}
    LIMIT 1
  `;

  if (!rows[0]) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
