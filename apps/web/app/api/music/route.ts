import { NextResponse } from "next/server";
import { commentsDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!commentsDb) return NextResponse.json([]);

  const tracks = await commentsDb`
    SELECT id, title, artist, album, file_path, artwork_path, duration_ms, slug
    FROM public.music
    ORDER BY created_at DESC
  `;

  return NextResponse.json(tracks);
}
