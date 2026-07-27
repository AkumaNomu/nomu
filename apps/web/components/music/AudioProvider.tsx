"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { mergeLibraryTracks, type LibraryTrack, type MusicRow } from "@/lib/musicLibrary";
import { MusicWidget } from "./MusicWidget";

const staticTracks = mergeLibraryTracks([]);

type AudioState = {
  current: number;
  currentSlug: string | null;
  tracks: LibraryTrack[];
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
  playTracks: (slugs: string[]) => void;
};

const AudioContext = createContext<AudioState | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayRef = useRef(false);
  const [tracks, setTracks] = useState<LibraryTrack[]>(staticTracks);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.55);
  const [queue, setQueue] = useState<string[]>([]);

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

  // Admin-managed DB rows and the file-scanned public/audio tracks merge into
  // one playable library (see lib/musicLibrary) — the same merge the /music
  // page runs server-side, so slugs match and playTrackBySlug resolves either.
  useEffect(() => {
    fetch("/api/music", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() as Promise<MusicRow[]> : []))
      .then((rows) => { if (rows.length) setTracks(mergeLibraryTracks(rows)); })
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
    const shouldPlay = !audio.paused || autoPlayRef.current;
    autoPlayRef.current = false;
    audio.src = track.src;
    localStorage.setItem("nomu-player-track", String(safeCurrent));
    if (shouldPlay) void audio.play();
  }, [safeCurrent, tracks]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const playPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play(); else audio.pause();
  }, []);
  // A selection from the library becomes a throwaway queue: skip/next walk it
  // instead of the whole library until a single track is picked again.
  const order = useMemo(() => {
    const fromQueue = queue.map((slug) => tracks.findIndex((track) => track.slug === slug)).filter((index) => index >= 0);
    return fromQueue.length ? fromQueue : tracks.map((_, index) => index);
  }, [queue, tracks]);
  const step = useCallback((delta: number) => {
    autoPlayRef.current = true;
    setCurrent((value) => {
      const position = order.indexOf(value);
      return order[((position < 0 ? 0 : position + delta) + order.length) % order.length];
    });
  }, [order]);
  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);
  const seek = useCallback((value: number) => { if (audioRef.current) audioRef.current.currentTime = value; }, []);
  const setVolume = useCallback((value: number) => { setVolumeState(value); localStorage.setItem("nomu-player-volume", String(value)); }, []);
  const openWidget = playPause;
  // Selecting a track has to defer the play() to the effect that swaps
  // audio.src — calling it here would start the *previous* src for a frame.
  const startSlug = useCallback((slug: string) => {
    const index = tracks.findIndex((track) => track.slug === slug);
    if (index < 0) return;
    const audio = audioRef.current;
    if (index === safeCurrent) { if (audio?.paused) void audio.play(); return; }
    autoPlayRef.current = true;
    setCurrent(index);
  }, [safeCurrent, tracks]);
  const playTrackBySlug = useCallback((slug: string) => { setQueue([]); startSlug(slug); }, [startSlug]);
  const playTracks = useCallback((slugs: string[]) => {
    if (!slugs.length) return;
    setQueue(slugs);
    startSlug(slugs[0]);
  }, [startSlug]);

  const value = useMemo(() => ({ current: safeCurrent, currentSlug: tracks[safeCurrent]?.slug ?? null, tracks, duration, playing, time, volume, playPause, next, previous, seek, setVolume, openWidget, playTrackBySlug, playTracks }), [safeCurrent, tracks, duration, playing, time, volume, playPause, next, previous, seek, setVolume, openWidget, playTrackBySlug, playTracks]);

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
