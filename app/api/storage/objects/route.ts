import { NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { getSupabaseEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function normalizeFolder(value: string | null) {
  return (value ?? "").replace(/[^a-z0-9-_/]/gi, "").replace(/^\/+|\/+$/g, "");
}

export async function GET(request: Request) {
  const admin = assertAdminRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const folder = normalizeFolder(url.searchParams.get("folder"));
  const { bucket } = getSupabaseEnv();

  const { data, error } = await supabase.storage.from(bucket).list(folder || undefined, {
    limit: 200,
    sortBy: { column: "created_at", order: "desc" }
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const objects = (data ?? []).map((item) => {
    const path = folder ? `${folder}/${item.name}` : item.name;
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);

    return {
      name: item.name,
      path,
      id: item.id,
      updatedAt: item.updated_at,
      createdAt: item.created_at,
      size: item.metadata?.size ?? null,
      mimeType: item.metadata?.mimetype ?? null,
      publicUrl: publicData.publicUrl
    };
  });

  return NextResponse.json({ bucket, folder, objects });
}

export async function DELETE(request: Request) {
  const admin = assertAdminRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const rawPath = typeof body.path === "string" ? body.path : "";
  const path = rawPath.replace(/[^a-z0-9-_.\/]/gi, "").replace(/^\/+/, "");

  if (!path) {
    return NextResponse.json({ error: "Missing asset path." }, { status: 400 });
  }

  const { bucket } = getSupabaseEnv();
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ deleted: true, path });
}
