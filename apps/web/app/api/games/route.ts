import { NextResponse } from "next/server";
import { commentsDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!commentsDb) return NextResponse.json([]);

  const games = await commentsDb`
    SELECT id, title, slug, description, thumbnail_path
    FROM public.games
    ORDER BY created_at DESC
  `;

  return NextResponse.json(games);
}
