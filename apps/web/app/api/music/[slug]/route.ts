import { NextResponse } from "next/server";
import { commentsDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!commentsDb) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const rows = await commentsDb`
    SELECT id, title, artist, album, file_path, artwork_path, duration_ms, slug, lyrics_md, notes_md
    FROM public.music
    WHERE slug = ${slug}
    LIMIT 1
  `;

  if (!rows[0]) return NextResponse.json({ error: "Track not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
