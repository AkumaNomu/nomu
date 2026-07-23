import { getCurrentUser } from "@/lib/auth";
import { commentsDb } from "@/lib/db";
import { slugify } from "@/lib/slugify";
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

export async function GET() {
  try {
    await requireAdmin();
    if (!commentsDb) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const tracks = await commentsDb`
      SELECT id, title, artist, album, file_path, artwork_path, duration_ms, slug, lyrics_md, notes_md, created_at
      FROM public.music
      ORDER BY created_at DESC
    `;

    return NextResponse.json(tracks);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: error instanceof Error && error.message.includes("Admin") ? 403 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    if (!commentsDb) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const body = await req.json() as { title: string; artist: string; album: string; file_path: string; artwork_path?: string; duration_ms?: number; slug?: string; lyrics_md?: string; notes_md?: string };

    const base = slugify(body.slug || `${body.title}-${body.artist}`);
    const taken = await commentsDb`SELECT slug FROM public.music WHERE slug LIKE ${base + "%"}` as { slug: string }[];
    const takenSet = new Set(taken.map((row) => row.slug));
    let slug = base;
    for (let n = 2; takenSet.has(slug); n += 1) slug = `${base}-${n}`;

    const result = await commentsDb`
      INSERT INTO public.music (title, artist, album, file_path, artwork_path, duration_ms, slug, lyrics_md, notes_md)
      VALUES (${body.title}, ${body.artist}, ${body.album}, ${body.file_path}, ${body.artwork_path || null}, ${body.duration_ms || null}, ${slug}, ${body.lyrics_md || null}, ${body.notes_md || null})
      RETURNING *
    `;

    await commentsDb`
      INSERT INTO public.admin_audit (user_id, action, resource_type, resource_id, details)
      VALUES (${user.id}, 'create', 'music', ${result[0]?.id}, ${JSON.stringify(body)})
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: error instanceof Error && error.message.includes("Admin") ? 403 : 400 });
  }
}
