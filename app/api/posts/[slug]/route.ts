import { NextRequest, NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { deletePost, getPostBySlug, updatePost } from "@/lib/posts";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({ post });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const admin = assertAdminRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { slug } = await params;

  try {
    const payload = await request.json();
    const post = await updatePost(slug, payload);
    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update post." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const admin = assertAdminRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { slug } = await params;

  try {
    await deletePost(slug);
    return NextResponse.json({ deleted: true, slug });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete post." },
      { status: 400 }
    );
  }
}
