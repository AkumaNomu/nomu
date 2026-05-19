import { getPosts } from "@/lib/posts";
import { GlobalMusicPlayer } from "@/components/global-music-player";

function normalizeService(value: unknown): "youtube" | "soundcloud" | "local" {
  return value === "soundcloud" ? "soundcloud" : value === "youtube" ? "youtube" : "local";
}

export async function GlobalMusicBootstrap() {
  const posts = await getPosts();
  const tracks = posts
    .map((post) => {
      const src = post.soundtrackFallbackSrc;
      if (!src) return null;
      return {
        src,
        title: post.soundtrackTitle ?? post.title,
        artist: post.soundtrackArtist ?? post.ref,
        sourceService: normalizeService(post.soundtrackService),
        sourceUrl: post.soundtrackUrl
      };
    })
    .filter(Boolean) as Array<{
    src: string;
    title: string;
    artist?: string;
    sourceService: "youtube" | "soundcloud" | "local";
    sourceUrl?: string;
  }>;

  return <GlobalMusicPlayer initialPlaylist={tracks} />;
}

