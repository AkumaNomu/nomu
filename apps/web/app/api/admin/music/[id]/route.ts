import { getCurrentUser } from "@/lib/auth";
import { commentsDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!commentsDb) throw new Error("Database not configured");

  const isAdmin = await commentsDb`
    SELECT is_admin FROM public.users WHERE id = ${user.id}
  ` as { is_admin: boolean }[];

  if (!isAdmin[0]?.is_admin) throw new Error("Admin access required");
  return user;
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAdmin();
    if (!commentsDb) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const track = await commentsDb`
      SELECT id FROM public.music WHERE id = ${id}
    `;

    if (!track[0]) return NextResponse.json({ error: "Track not found" }, { status: 404 });

    await commentsDb`
      DELETE FROM public.music WHERE id = ${id}
    `;

    await commentsDb`
      INSERT INTO public.admin_audit (user_id, action, resource_type, resource_id)
      VALUES (${user.id}, 'delete', 'music', ${id})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: error instanceof Error && error.message.includes("Admin") ? 403 : 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAdmin();
    if (!commentsDb) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const body = await req.json() as {
      title: string;
      artist: string;
      album: string;
      file_path: string;
      artwork_path?: string;
      duration_ms?: number | null;
      lyrics_md?: string;
      notes_md?: string;
    };

    const track = await commentsDb`
      SELECT id FROM public.music WHERE id = ${id}
    `;

    if (!track[0]) return NextResponse.json({ error: "Track not found" }, { status: 404 });

    const result = await commentsDb`
      UPDATE public.music
      SET
        title = ${body.title},
        artist = ${body.artist},
        album = ${body.album},
        file_path = ${body.file_path},
        artwork_path = ${body.artwork_path || null},
        duration_ms = ${body.duration_ms || null},
        lyrics_md = ${body.lyrics_md || null},
        notes_md = ${body.notes_md || null},
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;

    await commentsDb`
      INSERT INTO public.admin_audit (user_id, action, resource_type, resource_id, details)
      VALUES (${user.id}, 'update', 'music', ${id}, ${JSON.stringify(body)})
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: error instanceof Error && error.message.includes("Admin") ? 403 : 400 });
  }
}
