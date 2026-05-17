import type { ArchiveEntry } from "@/types/archive";

function getYouTubeVideoId(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1) || null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).at(-1) || null;
    }
  } catch {
    return null;
  }

  return null;
}

function getYouTubeEmbedUrl(url: string) {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}

function getSoundCloudEmbedUrl(url: string) {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(
    url
  )}&color=%231a1a1a&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&visual=false`;
}

function getRemoteEmbed(entry: ArchiveEntry) {
  if (!entry.soundtrackUrl) return null;

  if (entry.soundtrackService === "soundcloud") {
    return { src: getSoundCloudEmbedUrl(entry.soundtrackUrl), title: "SoundCloud player" };
  }

  const youtube = getYouTubeEmbedUrl(entry.soundtrackUrl);
  if (youtube) {
    return { src: youtube, title: "YouTube player" };
  }

  return null;
}

export function SoundtrackPlayer({ entry }: { entry: ArchiveEntry }) {
  const remoteEmbed = getRemoteEmbed(entry);
  const hasFallback = Boolean(entry.soundtrackFallbackSrc);
  const title = entry.soundtrackTitle ?? "Listening companion";
  const artist = entry.soundtrackArtist ?? "Embedded source";

  return (
    <section className="reader-player border-[0.5px] border-border-subtle bg-surface-container-low/40 p-4">
      <div className="mb-4">
        <p className="font-label-caps text-label-caps mb-2 text-ink-muted">Listening Room</p>
        <h2 className="font-headline-md text-headline-md text-primary">{title}</h2>
        <p className="font-ui-label text-ui-label mt-1 text-ink-muted">{artist}</p>
      </div>

      {remoteEmbed ? (
        <div className="reader-player-frame">
          <iframe
            src={remoteEmbed.src}
            title={remoteEmbed.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      ) : null}

      {hasFallback ? (
        <div className={`${remoteEmbed ? "mt-4 border-t-[0.5px] border-border-subtle pt-4" : ""}`}>
          <p className="font-label-caps text-label-caps mb-3 text-ink-muted">
            {remoteEmbed ? "Local fallback" : "Local track"}
          </p>
          <audio
            controls
            preload="none"
            src={entry.soundtrackFallbackSrc}
            className="reader-audio-player w-full"
          />
        </div>
      ) : null}

      {!remoteEmbed && !hasFallback ? (
        <p className="font-ui-label text-ui-label text-ink-muted">
          Add `soundtrackUrl` or `soundtrackFallbackSrc` to the markdown frontmatter.
        </p>
      ) : null}
    </section>
  );
}
