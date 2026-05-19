import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function asSlug(value: string | null) {
  const slug = (value ?? "").trim().toLowerCase();
  if (!slug) return null;
  return slug.replace(/[^a-z0-9-]/g, "");
}

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

  const url = new URL(request.url);
  const slug = asSlug(url.searchParams.get("slug"));
  if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });

  const { data, error } = await supabase
    .from("comments")
    .select("id, post_slug, author, body, created_at")
    .eq("post_slug", slug)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    slug,
    comments: (data ?? []).map((row) => ({
      id: row.id,
      postSlug: row.post_slug,
      author: row.author,
      body: row.body,
      createdAt: row.created_at
    }))
  });
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const slug = asSlug(typeof body.slug === "string" ? body.slug : null);
  const author = typeof body.author === "string" ? body.author.trim().slice(0, 80) : "";
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";

  if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  if (!author) return NextResponse.json({ error: "Missing author." }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Missing body." }, { status: 400 });

  const { data, error } = await supabase
    .from("comments")
    .insert({ post_slug: slug, author, body: text })
    .select("id, post_slug, author, body, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    comment: {
      id: data.id,
      postSlug: data.post_slug,
      author: data.author,
      body: data.body,
      createdAt: data.created_at
    }
  });
}

