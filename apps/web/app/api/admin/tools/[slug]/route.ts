import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminErrorStatus, requireAdmin, updateToolStatus, writeAuditLog } from "../../_lib";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  status: z.enum(["Live", "Experimental", "Paused"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const user = await requireAdmin();
    const payload = payloadSchema.parse(await request.json());
    const updated = await updateToolStatus(slug, payload.status);

    await writeAuditLog({
      userId: user.id,
      action: "update",
      resourceType: "tool",
      resourceId: slug,
      details: payload,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: adminErrorStatus(error) });
  }
}
