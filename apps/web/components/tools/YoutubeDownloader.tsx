"use client";

import { FormEvent, useState } from "react";
import styles from "./tools.module.css";

type Format = "mp3_128" | "mp3_192" | "mp3_320" | "wav" | "m4a" | "mp4_720";

const FORMATS: { value: Format; label: string; desc: string }[] = [
  { value: "mp3_128", label: "MP3 128 kbps", desc: "Small file, good for streaming" },
  { value: "mp3_192", label: "MP3 192 kbps", desc: "Balanced quality and size" },
  { value: "mp3_320", label: "MP3 320 kbps", desc: "Highest MP3 quality" },
  { value: "m4a", label: "M4A (AAC)", desc: "Better compression than MP3" },
  { value: "wav", label: "WAV", desc: "Lossless, uncompressed" },
  { value: "mp4_720", label: "MP4 up to 720p", desc: "Video, capped for faster downloads" },
];

export function YoutubeDownloader() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<Format>("mp3_192");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  async function handleDownload(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("Enter a supported media URL");
      return;
    }

    setLoading(true);
    setError(null);
    setProgress("Downloading and converting...");

    try {
      const res = await fetch("/api/tools/youtube-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, format }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "Download failed");
      }

      const blob = await res.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `download.${format.includes("mp3") ? "mp3" : format === "mp4_720" ? "mp4" : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);

      setProgress("");
      setUrl("");
      setError(null);
    } catch (err) {
      setError(String(err));
      setProgress("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleDownload} className={styles.form}>
        <div className={styles.inputGroup}>
          <input
            type="url"
            placeholder="Paste YouTube, SoundCloud, Vimeo, TikTok... URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className={styles.formatGrid}>
          {FORMATS.map((fmt) => (
            <label key={fmt.value} className={styles.formatOption}>
              <input
                type="radio"
                name="format"
                value={fmt.value}
                checked={format === fmt.value}
                onChange={(e) => setFormat(e.target.value as Format)}
                disabled={loading}
              />
              <span>
                <strong>{fmt.label}</strong>
                <small>{fmt.desc}</small>
              </span>
            </label>
          ))}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Download"}
        </button>
      </form>

      {error && <div className={styles.error}>{error}</div>}
      {progress && <div className={styles.progress}>{progress}</div>}

      <div className={styles.info}>
        <h3>About</h3>
        <ul>
          <li>Downloads from YouTube, SoundCloud, Vimeo, TikTok, Instagram, X, Twitch, and Facebook</li>
          <li>Converts audio to MP3, M4A, or WAV, or downloads MP4 video up to 720p</li>
          <li>Embeds title and artist metadata</li>
          <li>MP3 supports 128, 192, and 320 kbps quality</li>
          <li>Files download to your device — nothing stored</li>
        </ul>
      </div>
    </div>
  );
}
