import { YoutubeDownloader } from "@/components/tools/YoutubeDownloader";
import { ToolShell } from "@/components/tools/ToolShell";

export const metadata = {
  title: "YouTube Downloader",
  description: "Download audio from YouTube videos in MP3, M4A, or WAV format with metadata.",
};

export default function YoutubePage() {
  return (
    <ToolShell title="YouTube Downloader" description="Download audio from YouTube videos in MP3, M4A, or WAV format with metadata.">
      <YoutubeDownloader />
    </ToolShell>
  );
}
