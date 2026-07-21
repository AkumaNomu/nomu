import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { createReadStream, unlinkSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const config = { maxDuration: 60 };

const execAsync = promisify(exec);

const FORMATS = {
  mp3_128: { codec: "libmp3lame", bitrate: "128k", extension: "mp3" },
  mp3_192: { codec: "libmp3lame", bitrate: "192k", extension: "mp3" },
  mp3_320: { codec: "libmp3lame", bitrate: "320k", extension: "mp3" },
  wav: { codec: "pcm_s16le", bitrate: "", extension: "wav" },
  m4a: { codec: "aac", bitrate: "192k", extension: "m4a" },
} as const;

type Format = keyof typeof FORMATS;

async function downloadYoutube(url: string, format: Format) {
  if (!Object.keys(FORMATS).includes(format)) {
    throw new Error("Invalid format");
  }

  if (!/^https?:\/\/(www\.)?youtube\.com|youtu\.be/.test(url)) {
    throw new Error("Invalid YouTube URL");
  }

  const tmpId = randomUUID();
  const tmpDir = "/tmp";
  const audioFile = join(tmpDir, `${tmpId}.webm`);
  const outputFile = join(tmpDir, `${tmpId}.${FORMATS[format].extension}`);

  try {
    // Download audio from YouTube
    const { stdout: infoJson } = await execAsync(
      `yt-dlp -f bestaudio --dump-json "${url}" 2>/dev/null`,
      { timeout: 30000 }
    );

    const info = JSON.parse(infoJson);
    const title = info.title || "download";
    const artist = info.uploader || "YouTube";

    await execAsync(
      `yt-dlp -f bestaudio -o "${audioFile}" "${url}" 2>/dev/null`,
      { timeout: 45000 }
    );

    // Convert to target format with FFmpeg
    const ffmpegCmd = FORMATS[format].bitrate
      ? `ffmpeg -i "${audioFile}" -c:a ${FORMATS[format].codec} -b:a ${FORMATS[format].bitrate} -metadata title="${title}" -metadata artist="${artist}" "${outputFile}" -y 2>/dev/null`
      : `ffmpeg -i "${audioFile}" -c:a ${FORMATS[format].codec} -metadata title="${title}" -metadata artist="${artist}" "${outputFile}" -y 2>/dev/null`;

    await execAsync(ffmpegCmd, { timeout: 45000 });

    // Read file and return
    const stream = createReadStream(outputFile);
    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  } finally {
    try {
      unlinkSync(audioFile);
      unlinkSync(outputFile);
    } catch {}
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { url: string; format: Format };

    if (!body.url || !body.format) {
      return NextResponse.json({ error: "URL and format required" }, { status: 400 });
    }

    const buffer = await downloadYoutube(body.url, body.format);
    const fmt = FORMATS[body.format];

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": fmt.extension === "mp3" ? "audio/mpeg" : `audio/${fmt.extension}`,
        "Content-Disposition": `attachment; filename="download.${fmt.extension}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const msg = String(error);
    if (msg.includes("Invalid")) return NextResponse.json({ error: msg }, { status: 400 });
    if (msg.includes("timeout")) return NextResponse.json({ error: "Download timeout - video too long" }, { status: 408 });
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
