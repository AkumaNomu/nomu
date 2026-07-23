import { NextRequest, NextResponse } from "next/server";
import { commentsDb } from "@/lib/db";
import { adminErrorStatus, requireAdmin, writeAuditLog } from "../../_lib";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAdmin();
    if (!commentsDb) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const game = await commentsDb`SELECT id FROM public.games WHERE id = ${id}`;
    if (!game[0]) return NextResponse.json({ error: "Game not found" }, { status: 404 });

    await commentsDb`DELETE FROM public.games WHERE id = ${id}`;
    await writeAuditLog({ userId: user.id, action: "delete", resourceType: "game", resourceId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: adminErrorStatus(error) });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAdmin();
    if (!commentsDb) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const body = await req.json() as { title: string; description?: string; thumbnail_path?: string; file_path: string };

    const game = await commentsDb`SELECT id FROM public.games WHERE id = ${id}`;
    if (!game[0]) return NextResponse.json({ error: "Game not found" }, { status: 404 });

    const result = await commentsDb`
      UPDATE public.games
      SET
        title = ${body.title},
        description = ${body.description || null},
        thumbnail_path = ${body.thumbnail_path || null},
        file_path = ${body.file_path},
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;

    await writeAuditLog({ userId: user.id, action: "update", resourceType: "game", resourceId: id, details: body });

    return NextResponse.json(result[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: adminErrorStatus(error) });
  }
}
