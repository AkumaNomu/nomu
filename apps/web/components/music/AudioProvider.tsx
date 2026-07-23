"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { tracks as staticTracks } from "@/lib/tracks";
import type { Track } from "@/lib/tracks";
import { FALLBACK_ARTWORK } from "@/lib/musicArtwork";
import { MusicWidget } from "./MusicWidget";

type LibraryTrack = Track & { slug?: string };
type DbTrack = { id: string; title: string; artist: string; album: string; file_path: string; artwork_path?: string; duration_ms?: number; slug: string };

type AudioState = {
  current: number;
  duration: number;
  playing: boolean;
  time: number;
  volume: number;
  playPause: () => void;
  next: () => void;
  previous: () => void;
  seek: (value: number) => void;
  setVolume: (value: number) => void;
  openWidget: () => void;
  playTrackBySlug: (slug: string) => void;
};

const AudioContext = createContext<AudioState | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<LibraryTrack[]>(staticTracks);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.55);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedTrack = Number(localStorage.getItem("nomu-player-track") ?? 0);
      const savedVolume = Number(localStorage.getItem("nomu-player-volume") ?? 0.55);
      if (Number.isFinite(savedTrack)) setCurrent(Math.min(tracks.length - 1, Math.max(0, savedTrack)));
      if (Number.isFinite(savedVolume)) setVolumeState(Math.min(1, Math.max(0, savedVolume)));
    });
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The site's music library lives in the DB (admin-managed) — it's the real
  // playback source. The static, file-scanned lib/tracks.ts stays as a
  // fallback for when the DB is empty or unreachable, so the widget never
  // renders with zero tracks.
  useEffect(() => {
    fetch("/api/music", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() as Promise<DbTrack[]> : []))
      .then((rows) => {
        if (!rows.length) return;
        setTracks(rows.map((row) => ({
          title: row.title,
          artist: row.artist,
          album: row.album,
          artwork: row.artwork_path || FALLBACK_ARTWORK,
          src: row.file_path,
          slug: row.slug,
        })));
      })
      .catch(() => {});
  }, []);

  // Clamp inline rather than in an effect: the DB fetch can shrink the list
  // after a stale index was restored from localStorage, and re-deriving here
  // avoids a second render pass just to correct out-of-range state.
  const safeCurrent = Math.min(current, Math.max(0, tracks.length - 1));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const track = tracks[safeCurrent];
    if (!track) return;
    const wasPlaying = !audio.paused;
    audio.src = track.src;
    localStorage.setItem("nomu-player-track", String(safeCurrent));
    if (wasPlaying) void audio.play();
  }, [safeCurrent, tracks]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const playPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play(); else audio.pause();
  }, []);
  const next = useCallback(() => setCurrent((value) => (value + 1) % tracks.length), [tracks.length]);
  const previous = useCallback(() => setCurrent((value) => (value - 1 + tracks.length) % tracks.length), [tracks.length]);
  const seek = useCallback((value: number) => { if (audioRef.current) audioRef.current.currentTime = value; }, []);
  const setVolume = useCallback((value: number) => { setVolumeState(value); localStorage.setItem("nomu-player-volume", String(value)); }, []);
  const openWidget = playPause;
  const playTrackBySlug = useCallback((slug: string) => {
    const index = tracks.findIndex((track) => track.slug === slug);
    if (index < 0) return;
    setCurrent(index);
    const audio = audioRef.current;
    if (audio) void audio.play();
  }, [tracks]);

  const value = useMemo(() => ({ current: safeCurrent, duration, playing, time, volume, playPause, next, previous, seek, setVolume, openWidget, playTrackBySlug }), [safeCurrent, duration, playing, time, volume, playPause, next, previous, seek, setVolume, openWidget, playTrackBySlug]);

  return (
    <AudioContext.Provider value={value}>
      {children}
      <MusicWidget
        currentTrack={tracks[safeCurrent] ?? staticTracks[0]}
        duration={duration}
        playing={playing}
        time={time}
        volume={volume}
        next={next}
        playPause={playPause}
        previous={previous}
        seek={seek}
        setVolume={setVolume}
      />
      {/* preload="metadata" streams via HTTP range requests on play, never fetches the full file upfront */}
      <audio ref={audioRef} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onEnded={next} />
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const value = useContext(AudioContext);
  if (!value) throw new Error("useAudio must be used within AudioProvider");
  return value;
}
