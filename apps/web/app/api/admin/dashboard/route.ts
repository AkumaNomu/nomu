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
  created_at: string;
};

export async function GET() {
  try {
    await requireAdmin();
    if (!commentsDb) throw new Error("Database not configured");

    const [posts, projects, tools, comments, tracks] = await Promise.all([
      listContentEntries("blog"),
      listContentEntries("projects"),
      readToolEntries(),
      commentsDb`
        SELECT id, slug, parent_id, author, body, created_at
        FROM public.comments
        ORDER BY created_at DESC
      ` as unknown as Promise<CommentRow[]>,
      commentsDb`
        SELECT id, title, artist, album, file_path, artwork_path, duration_ms, created_at
        FROM public.music
        ORDER BY created_at DESC
      ` as unknown as Promise<TrackRow[]>,
    ]);

    return NextResponse.json({ posts, projects, tools, comments, tracks });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: adminErrorStatus(error) });
  }
}
