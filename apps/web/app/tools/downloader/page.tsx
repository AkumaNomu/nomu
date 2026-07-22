import type { Metadata } from "next";
import { YoutubeDownloader } from "@/components/tools/YoutubeDownloader";
import { ToolShell } from "@/components/tools/ToolShell";

export const metadata: Metadata = { title: "Downloader", description: "Download audio from YouTube and SoundCloud in MP3, M4A, or WAV format." };

export default function DownloaderPage() {
  return <ToolShell title="Downloader" description="Download audio from supported media links in MP3, M4A, or WAV format."><YoutubeDownloader /></ToolShell>;
}
