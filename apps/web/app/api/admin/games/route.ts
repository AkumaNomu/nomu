import { NextRequest, NextResponse } from "next/server";
import { commentsDb } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { adminErrorStatus, requireAdmin, writeAuditLog } from "../_lib";

export async function GET() {
  try {
    await requireAdmin();
    if (!commentsDb) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const games = await commentsDb`
      SELECT id, title, slug, description, thumbnail_path, file_path, created_at
      FROM public.games
      ORDER BY created_at DESC
    `;

    return NextResponse.json(games);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: adminErrorStatus(error) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    if (!commentsDb) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const body = await req.json() as { title: string; slug?: string; description?: string; thumbnail_path?: string; file_path: string };

    const base = slugify(body.slug || body.title);
    const taken = await commentsDb`SELECT slug FROM public.games WHERE slug LIKE ${base + "%"}` as { slug: string }[];
    const takenSet = new Set(taken.map((row) => row.slug));
    let slug = base;
    for (let n = 2; takenSet.has(slug); n += 1) slug = `${base}-${n}`;

    const result = await commentsDb`
      INSERT INTO public.games (title, slug, description, thumbnail_path, file_path)
      VALUES (${body.title}, ${slug}, ${body.description || null}, ${body.thumbnail_path || null}, ${body.file_path})
      RETURNING *
    `;

    await writeAuditLog({ userId: user.id, action: "create", resourceType: "game", resourceId: result[0]?.id, details: body });

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: adminErrorStatus(error) });
  }
}
