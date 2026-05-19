import { NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { getSupabaseEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import sharp from "sharp";

function safeFileName(name: string) {
  const extension = name.includes(".") ? `.${name.split(".").pop()}` : "";
  const base = name.replace(extension, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  return `${base || "asset"}-${Date.now()}${extension}`;
}

async function compressIfSupported(file: File, buffer: Buffer) {
  // Images: transcode to WebP to save space. Audio: passthrough (no ffmpeg available).
  const mime = file.type || "application/octet-stream";

  if (mime.startsWith("image/")) {
    const transcoded = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    return {
      buffer: transcoded,
      contentType: "image/webp",
      extension: ".webp",
      compressed: true
    } as const;
  }

  return { buffer, contentType: mime, extension: null, compressed: false } as const;
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
  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const processed = await compressIfSupported(file, originalBuffer);

  const baseName = safeFileName(file.name);
  const normalizedName =
    processed.extension && baseName.includes(".") ? `${baseName.replace(/\.[^.]+$/, processed.extension)}` : baseName;
  const path = `${folder}/${normalizedName}`;

  const { data, error } = await supabase.storage.from(bucket).upload(path, processed.buffer, {
    contentType: processed.contentType,
    upsert: false
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return NextResponse.json({
    bucket,
    path: data.path,
    publicUrl: publicData.publicUrl,
    compressed: processed.compressed,
    contentType: processed.contentType
  });
}
