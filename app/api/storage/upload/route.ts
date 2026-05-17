import { NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { getSupabaseEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function safeFileName(name: string) {
  const extension = name.includes(".") ? `.${name.split(".").pop()}` : "";
  const base = name.replace(extension, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  return `${base || "asset"}-${Date.now()}${extension}`;
}

export async function POST(request: Request) {
  const admin = assertAdminRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const { bucket } = getSupabaseEnv();
  const folder = String(formData.get("folder") ?? "uploads").replace(/[^a-z0-9-_/]/gi, "");
  const path = `${folder}/${safeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return NextResponse.json({
    bucket,
    path: data.path,
    publicUrl: publicData.publicUrl
  });
}
