import { NextResponse } from "next/server";
import { commentsDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

function unavailable() {
  return NextResponse.json(
    { error: "Comments backend is not configured." },
    { status: 503 },
  );
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!commentsDb) return unavailable();

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Log in to delete comments." }, { status: 401 });

  const idResult = idSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json({ error: "Invalid comment ID." }, { status: 400 });
  }

  try {
    const comment = await commentsDb`
      SELECT user_id, author FROM public.comments WHERE id = ${idResult.data}
    ` as { user_id: string | null; author: string }[];

    if (!comment[0]) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    const isOwner = comment[0].user_id === user.id;
    const isAdmin = await commentsDb`
      SELECT is_admin FROM public.users WHERE id = ${user.id}
    ` as { is_admin: boolean }[];

    if (!isOwner && !isAdmin[0]?.is_admin) {
      return NextResponse.json({ error: "Cannot delete other users' comments." }, { status: 403 });
    }

    await commentsDb`
      DELETE FROM public.comments WHERE id = ${idResult.data}
    `;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete comment." }, { status: 500 });
  }
}
