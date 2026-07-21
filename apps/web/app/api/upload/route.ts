import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { commentsDb } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const config = { api: { bodyParser: { sizeLimit: "100mb" } } };

const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg"];
const ALLOWED_IMAGE_TYPES = ["image/svg+xml", "image/png", "image/jpeg", "image/webp"];
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!commentsDb) throw new Error("Database not configured");

  const isAdmin = await commentsDb`
    SELECT is_admin FROM public.users WHERE id = ${user.id}
  ` as { is_admin: boolean }[];

  if (!isAdmin[0]?.is_admin) throw new Error("Admin access required");
  return user;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "audio" or "cover"

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!type || !["audio", "cover"].includes(type)) {
      return NextResponse.json({ error: "Invalid type (audio or cover)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isAudio = type === "audio";
    const isAllowed = isAudio
      ? ALLOWED_AUDIO_TYPES.includes(file.type) && buffer.length <= MAX_AUDIO_SIZE
      : ALLOWED_IMAGE_TYPES.includes(file.type) && buffer.length <= MAX_IMAGE_SIZE;

    if (!isAllowed) {
      return NextResponse.json({ error: `Invalid ${type} file` }, { status: 400 });
    }

    const dir = isAudio ? "public/audio" : "public/covers";
    const ext = file.name.split(".").pop() || (isAudio ? "mp3" : "png");
    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(process.cwd(), "apps/web", dir, filename);

    await mkdir(join(process.cwd(), "apps/web", dir), { recursive: true });
    await writeFile(filepath, buffer);

    const path = `/${dir}/${filename}`;
    return NextResponse.json({ path, filename }, { status: 201 });
  } catch (error) {
    const msg = String(error);
    if (msg.includes("Admin")) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
