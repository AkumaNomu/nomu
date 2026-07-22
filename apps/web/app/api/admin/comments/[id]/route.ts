import { NextResponse } from "next/server";
import { commentsDb } from "@/lib/db";
import { adminErrorStatus, requireAdmin, writeAuditLog } from "../../_lib";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireAdmin();
    if (!commentsDb) throw new Error("Database not configured");

    const rows = await commentsDb`
      SELECT id, slug FROM public.comments WHERE id = ${id} LIMIT 1
    ` as { id: string; slug: string }[];

    if (!rows[0]) throw new Error("comment not found");

    await commentsDb`
      DELETE FROM public.comments WHERE id = ${id}
    `;

    await writeAuditLog({
      userId: user.id,
      action: "delete",
      resourceType: "comment",
      resourceId: id,
      details: { slug: rows[0].slug },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: adminErrorStatus(error) });
  }
}
