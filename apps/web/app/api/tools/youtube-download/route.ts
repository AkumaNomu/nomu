import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { createReadStream, unlinkSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import ffmpegPath from "ffmpeg-static";
import ytdlp from "yt-dlp-exec";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const execFileAsync = promisify(execFile);

const FORMATS = {
  mp3_128: { codec: "libmp3lame", bitrate: "128k", extension: "mp3" },
  mp3_192: { codec: "libmp3lame", bitrate: "192k", extension: "mp3" },
  mp3_320: { codec: "libmp3lame", bitrate: "320k", extension: "mp3" },
  wav: { codec: "pcm_s16le", bitrate: "", extension: "wav" },
  m4a: { codec: "aac", bitrate: "192k", extension: "m4a" },
  mp4_720: { codec: "", bitrate: "", extension: "mp4" },
} as const;

type Format = keyof typeof FORMATS;

const SUPPORTED_HOSTS = new Set([
  "youtube.com", "youtu.be", "soundcloud.com", "vimeo.com", "tiktok.com",
  "instagram.com", "x.com", "twitter.com", "twitch.tv", "facebook.com",
]);

function isSupportedUrl(value: string) {
  try {
    const { protocol, hostname } = new URL(value);
    const host = hostname.toLowerCase().replace(/^www\./, "");
    return protocol === "https:" && [...SUPPORTED_HOSTS].some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

async function downloadMedia(url: string, format: Format) {
  if (!Object.keys(FORMATS).includes(format)) {
    throw new Error("Invalid format");
  }

  if (!isSupportedUrl(url)) {
    throw new Error("Unsupported media URL");
  }

  if (!ffmpegPath) {
    throw new Error("ffmpeg binary not available");
  }

  const tmpId = randomUUID();
  const tmpDir = "/tmp";
  const audioFile = join(tmpDir, `${tmpId}.webm`);
  const outputFile = join(tmpDir, `${tmpId}.${FORMATS[format].extension}`);

  try {
    // Fetch metadata (execa-based, no shell — safe against untrusted URLs)
    const info = await ytdlp(url, { dumpJson: true, noWarnings: true }) as { title?: string; uploader?: string };
    const title = info.title || "download";
    const artist = info.uploader || "Media";

    if (format === "mp4_720") {
      await ytdlp(url, {
        format: "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]",
        mergeOutputFormat: "mp4",
        noPlaylist: true,
        output: outputFile,
      }, { timeout: 45000 });

      return await readFile(outputFile);
    }

    // Download best audio track
    await ytdlp(url, { format: "bestaudio", output: audioFile }, { timeout: 45000 });

    // Convert to target format with FFmpeg
    const fmt = FORMATS[format];
    const ffmpegArgs = [
      "-i", audioFile,
      "-c:a", fmt.codec,
      ...(fmt.bitrate ? ["-b:a", fmt.bitrate] : []),
      "-metadata", `title=${title}`,
      "-metadata", `artist=${artist}`,
      "-y", outputFile,
    ];
    await execFileAsync(ffmpegPath, ffmpegArgs, { timeout: 45000 });

    return await readFile(outputFile);
  } finally {
    try {
      unlinkSync(audioFile);
      unlinkSync(outputFile);
    } catch {}
  }
}

async function readFile(path: string) {
  const stream = createReadStream(path);
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk as Buffer));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { url: string; format: Format };

    if (!body.url || !body.format) {
      return NextResponse.json({ error: "URL and format required" }, { status: 400 });
    }

    const buffer = await downloadMedia(body.url, body.format);
    const fmt = FORMATS[body.format];

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": fmt.extension === "mp3" ? "audio/mpeg" : fmt.extension === "mp4" ? "video/mp4" : `audio/${fmt.extension}`,
        "Content-Disposition": `attachment; filename="download.${fmt.extension}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const msg = String(error);
    if (msg.includes("Invalid") || msg.includes("Unsupported")) return NextResponse.json({ error: msg }, { status: 400 });
    if (msg.includes("timeout")) return NextResponse.json({ error: "Download timeout - video too long" }, { status: 408 });
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
