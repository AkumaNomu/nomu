import { promises as fs } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { CONTENT_ROOT } from "@/lib/markdown";

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".md": "text/markdown; charset=utf-8",
  ".markdown": "text/markdown; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp"
};

export async function GET(_request: Request, { params }: { params: Promise<{ asset: string[] }> }) {
  const { asset } = await params;
  const relativePath = asset.join(path.sep);
  const absolutePath = path.resolve(CONTENT_ROOT, relativePath);

  if (!absolutePath.startsWith(CONTENT_ROOT)) {
    notFound();
  }

  try {
    const buffer = await fs.readFile(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();

    return new Response(buffer, {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    notFound();
  }
}
