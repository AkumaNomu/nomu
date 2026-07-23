import { NextResponse } from "next/server";
import { commentsDb } from "@/lib/db";
import { adminErrorStatus, listContentEntries, readToolEntries, requireAdmin } from "../_lib";

export const dynamic = "force-dynamic";

type CommentRow = {
  id: string;
  slug: string;
  parent_id: string | null;
  author: string;
  body: string;
  created_at: string;
};

type TrackRow = {
  id: string;
  title: string;
  artist: string;
  album: string;
  file_path: string;
  artwork_path?: string;
  duration_ms?: number;
  slug: string;
  lyrics_md?: string;
  notes_md?: string;
  created_at: string;
};

type GameRow = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail_path?: string;
  file_path: string;
  created_at: string;
};

export async function GET() {
  try {
    await requireAdmin();
    if (!commentsDb) throw new Error("Database not configured");

    const [posts, projects, tools, comments, tracks, games] = await Promise.all([
      listContentEntries("blog"),
      listContentEntries("projects"),
      readToolEntries(),
      commentsDb`
        SELECT id, slug, parent_id, author, body, created_at
        FROM public.comments
        ORDER BY created_at DESC
      ` as unknown as Promise<CommentRow[]>,
      commentsDb`
        SELECT id, title, artist, album, file_path, artwork_path, duration_ms, slug, lyrics_md, notes_md, created_at
        FROM public.music
        ORDER BY created_at DESC
      ` as unknown as Promise<TrackRow[]>,
      commentsDb`
        SELECT id, title, slug, description, thumbnail_path, file_path, created_at
        FROM public.games
        ORDER BY created_at DESC
      ` as unknown as Promise<GameRow[]>,
    ]);

    return NextResponse.json({ posts, projects, tools, comments, tracks, games });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: adminErrorStatus(error) });
  }
}
