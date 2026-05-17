import { NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { createPost, getPosts } from "@/lib/posts";
import type { EntryType } from "@/types/archive";

function validType(value: string | null): EntryType | null {
  if (value === "essay" || value === "fragment" || value === "chronicle") return value;
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const type = validType(url.searchParams.get("type"));
  const tag = url.searchParams.get("tag");
  const posts = await getPosts({ query, type, tag });

  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const admin = assertAdminRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  try {
    const payload = await request.json();
    const post = await createPost(payload);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create post." },
      { status: 400 }
    );
  }
}
