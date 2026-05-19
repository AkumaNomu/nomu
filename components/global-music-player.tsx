"use client";

import { useEffect, useMemo, useState } from "react";
import { AudioPlayer } from "@/components/audio-player";
import { SymbolIcon } from "@/components/icons";

type PlaylistTrack = {
  src: string;
  title: string;
  artist?: string;
  sourceService: "youtube" | "soundcloud" | "local";
  sourceUrl?: string;
};

const PLAYLIST_STORAGE_KEY = "archive-global-playlist-v1";
const CURRENT_TRACK_KEY = "archive-global-track-v1";

const DEFAULT_PLAYLIST: PlaylistTrack[] = [
  {
    src: "/api/content-assets/media/nomu-fallback.wav",
    title: "Lofi Stream (Fallback Audio)",
    artist: "Source: YouTube",
    sourceService: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk"
  }
];

function safeParsePlaylist(raw: string | null): PlaylistTrack[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const tracks = parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const track = item as Partial<PlaylistTrack>;
        if (typeof track.src !== "string" || typeof track.title !== "string") return null;
        const service = track.sourceService ?? "local";
        if (service !== "youtube" && service !== "soundcloud" && service !== "local") return null;
        return {
          src: track.src,
          title: track.title,
          artist: typeof track.artist === "string" ? track.artist : undefined,
          sourceService: service,
          sourceUrl: typeof track.sourceUrl === "string" ? track.sourceUrl : undefined
        } satisfies PlaylistTrack;
      })
      .filter(Boolean) as PlaylistTrack[];
    return tracks.length ? tracks : null;
  } catch {
    return null;
  }
}

function pickRandomIndex(length: number, exclude: number | null) {
  if (length <= 1) return 0;
  const next = Math.floor(Math.random() * length);
  if (exclude == null) return next;
  return next === exclude ? (next + 1) % length : next;
}

export function GlobalMusicPlayer({ initialPlaylist }: { initialPlaylist?: PlaylistTrack[] }) {
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>(() =>
    initialPlaylist && initialPlaylist.length ? initialPlaylist : DEFAULT_PLAYLIST
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = playlist[currentIndex] ?? playlist[0];

  useEffect(() => {
    const stored = safeParsePlaylist(window.localStorage.getItem(PLAYLIST_STORAGE_KEY));
    if (stored) {
      setPlaylist(stored);
    }

    const storedIndex = Number(window.localStorage.getItem(CURRENT_TRACK_KEY));
    const baseList = stored ?? (initialPlaylist && initialPlaylist.length ? initialPlaylist : DEFAULT_PLAYLIST);
    if (Number.isFinite(storedIndex) && storedIndex >= 0) {
      setCurrentIndex(Math.min(Math.floor(storedIndex), baseList.length - 1));
    }
  }, [initialPlaylist]);

  useEffect(() => {
    window.localStorage.setItem(CURRENT_TRACK_KEY, String(currentIndex));
  }, [currentIndex]);

  const serviceLabel = useMemo(() => {
    const services = new Set(playlist.map((track) => track.sourceService).filter((service) => service !== "local"));
    if (services.size === 1) return Array.from(services)[0];
    if (services.size > 1) return "mixed";
    return "local";
  }, [playlist]);

  function nextRandom() {
    setCurrentIndex((index) => pickRandomIndex(playlist.length, index));
  }

  if (!current) return null;

  return (
    <aside className="global-music">
      <div className="global-music-inner">
        <div className="global-music-head">
          <span className="global-music-eyebrow">Now Playing</span>
          <span className="global-music-service" title="Playlist source">
            {serviceLabel === "mixed" ? "YouTube + SoundCloud" : serviceLabel}
          </span>
        </div>

        <AudioPlayer
          src={current.src}
          title={current.title}
          artist={current.artist}
          onEnded={nextRandom}
        />

        <div className="global-music-actions">
          <button type="button" className="icon-button icon-button-ghost" onClick={nextRandom} aria-label="Next random track">
            <SymbolIcon name="shuffle" className="icon-button-glyph" />
          </button>
          {current.sourceUrl ? (
            <a
              className="global-music-source"
              href={current.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open original source"
            >
              <SymbolIcon name="open_in_new" className="icon-button-glyph" />
            </a>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
