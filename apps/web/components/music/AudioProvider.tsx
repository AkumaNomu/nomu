"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { mergeLibraryTracks, type LibraryTrack, type MusicRow } from "@/lib/musicLibrary";
import { MusicWidget } from "./MusicWidget";

const staticTracks = mergeLibraryTracks([]);

// One <audio> element can't overlap two sources, so a track switch fades the
// old one out, swaps src, then fades the new one in. alive lets a newer
// transition or a manual volume change supersede a ramp mid-flight.
function rampVolume(audio: HTMLAudioElement, from: number, to: number, ms: number, alive: () => boolean) {
  return new Promise<void>((resolve) => {
    audio.volume = from;
    const started = performance.now();
    const tick = (now: number) => {
      if (!alive()) return resolve();
      const t = Math.min(1, (now - started) / ms);
      audio.volume = from + (to - from) * t;
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

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
  toggleMute: () => void;
  openWidget: () => void;
  playTrackBySlug: (slug: string) => void;
  playTracks: (slugs: string[]) => void;
  locked: boolean;
  lockTracks: (slugs: readonly string[]) => void;
  unlockTracks: () => void;
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
  const [lock, setLock] = useState<readonly string[] | null>(null);
  const lockRef = useRef<readonly string[] | null>(null);
  const lockTracks = useCallback((slugs: readonly string[]) => { lockRef.current = [...slugs]; setLock([...slugs]); }, []);
  const unlockTracks = useCallback(() => { lockRef.current = null; setLock(null); }, []);
  const lastVolume = useRef(0.55);
  const userVolumeRef = useRef(0.55);
  const fadingRef = useRef(false);
  const fadeIdRef = useRef(0);
  const currentSrcRef = useRef<string | null>(null);

  useEffect(() => () => { fadeIdRef.current += 1; }, []);

  const cancelFade = useCallback(() => { fadeIdRef.current += 1; fadingRef.current = false; }, []);

  // New tracks fade in slowly from silence instead of starting at full volume.
  const softPlay = useCallback((audio: HTMLAudioElement, fadeMs = 2500, onBlocked?: () => void) => {
    const id = ++fadeIdRef.current;
    fadingRef.current = true;
    const alive = () => id === fadeIdRef.current;
    audio.volume = 0;
    void audio.play().then(() => {
      if (!alive()) return;
      void rampVolume(audio, 0, userVolumeRef.current, fadeMs, alive).then(() => { if (alive()) fadingRef.current = false; });
    }).catch(() => { if (alive()) { fadingRef.current = false; audio.volume = userVolumeRef.current; onBlocked?.(); } });
  }, []);

  const clicksRef = useRef(0);
  const userDrivenRef = useRef(false);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedTrack = Number(localStorage.getItem("nomu-player-track") ?? 0);
      const savedVolume = Number(localStorage.getItem("nomu-player-volume") ?? 0.55);
      if (Number.isFinite(savedTrack)) setCurrent(Math.min(tracks.length - 1, Math.max(0, savedTrack)));
      if (Number.isFinite(savedVolume)) {
        const restored = Math.min(1, Math.max(0, savedVolume));
        setVolumeState(restored);
        if (restored > 0) lastVolume.current = restored;
      }
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
    const wantsPlay = !audio.paused || autoPlayRef.current;
    autoPlayRef.current = false;
    localStorage.setItem("nomu-player-track", String(safeCurrent));
    if (track.src === currentSrcRef.current) {
      if (wantsPlay && audio.paused) softPlay(audio);
      return;
    }
    currentSrcRef.current = track.src;
    if (!wantsPlay) { cancelFade(); audio.src = track.src; return; }
    const id = ++fadeIdRef.current;
    fadingRef.current = true;
    const alive = () => id === fadeIdRef.current;
    void (async () => {
      try {
        if (!audio.paused) {
          await rampVolume(audio, audio.volume, 0, 800, alive);
          if (!alive()) return;
          audio.pause();
        }
        audio.src = track.src;
        audio.volume = 0;
        await audio.play();
        if (!alive()) return;
        await rampVolume(audio, 0, userVolumeRef.current, 2500, alive);
      } catch {
        if (alive()) audio.volume = userVolumeRef.current;
      } finally {
        if (alive()) fadingRef.current = false;
      }
    })();
  }, [safeCurrent, tracks, cancelFade, softPlay]);

  useEffect(() => {
    userVolumeRef.current = volume;
    const audio = audioRef.current;
    if (!audio) return;
    if (fadingRef.current) cancelFade();
    audio.volume = volume;
  }, [volume, cancelFade]);

  // The second click anywhere starts the music with a very slow fade-in,
  // unless the user already drove playback themselves. Runs inside the
  // click handler so the play() keeps its user-gesture allowance.
  useEffect(() => {
    const onClick = () => {
      clicksRef.current += 1;
      if (clicksRef.current < 2 || autoStartedRef.current || userDrivenRef.current) return;
      const audio = audioRef.current;
      const track = tracks[safeCurrent];
      if (!audio || !track || !audio.paused) return;
      if (currentSrcRef.current !== track.src) { currentSrcRef.current = track.src; audio.src = track.src; }
      autoStartedRef.current = true;
      softPlay(audio, 8000, () => { autoStartedRef.current = false; });
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [tracks, safeCurrent, softPlay]);

  const playPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    userDrivenRef.current = true;
    cancelFade();
    if (audio.paused) { audio.volume = userVolumeRef.current; void audio.play(); }
    else audio.pause();
  }, [cancelFade]);
  // A selection from the library becomes a throwaway queue: skip/next walk it
  // instead of the whole library until a single track is picked again.
  const order = useMemo(() => {
    const fromQueue = queue.map((slug) => tracks.findIndex((track) => track.slug === slug)).filter((index) => index >= 0);
    return fromQueue.length ? fromQueue : tracks.map((_, index) => index);
  }, [queue, tracks]);
  const step = useCallback((delta: number) => {
    if (lockRef.current) return;
    autoPlayRef.current = true;
    setCurrent((value) => {
      const position = order.indexOf(value);
      return order[((position < 0 ? 0 : position + delta) + order.length) % order.length];
    });
  }, [order]);
  const next = useCallback(() => { userDrivenRef.current = true; step(1); }, [step]);
  const previous = useCallback(() => { userDrivenRef.current = true; step(-1); }, [step]);
  const seek = useCallback((value: number) => { if (audioRef.current) audioRef.current.currentTime = value; }, []);
  const setVolume = useCallback((value: number) => { setVolumeState(value); if (value > 0) lastVolume.current = value; localStorage.setItem("nomu-player-volume", String(value)); }, []);
  const toggleMute = useCallback(() => {
    if (volume === 0) setVolume(lastVolume.current > 0 ? lastVolume.current : 0.55);
    else { lastVolume.current = volume; setVolume(0); }
  }, [volume, setVolume]);
  const openWidget = playPause;
  // Selecting a track has to defer the play() to the effect that swaps
  // audio.src — calling it here would start the *previous* src for a frame.
  const startSlug = useCallback((slug: string) => {
    const lock = lockRef.current;
    if (lock && !lock.includes(slug)) return;
    const index = tracks.findIndex((track) => track.slug === slug);
    if (index < 0) return;
    const audio = audioRef.current;
    if (index === safeCurrent) { if (audio?.paused) softPlay(audio); return; }
    autoPlayRef.current = true;
    setCurrent(index);
  }, [safeCurrent, tracks, softPlay]);
  const playTrackBySlug = useCallback((slug: string) => { setQueue([]); startSlug(slug); }, [startSlug]);
  const playTracks = useCallback((slugs: string[]) => {
    if (!slugs.length) return;
    const lock = lockRef.current;
    if (lock && !slugs.every((slug) => lock.includes(slug))) return;
    setQueue(slugs);
    startSlug(slugs[0]);
  }, [startSlug]);

  const value = useMemo(() => ({ current: safeCurrent, currentSlug: tracks[safeCurrent]?.slug ?? null, tracks, duration, playing, time, volume, playPause, next, previous, seek, setVolume, toggleMute, openWidget, playTrackBySlug, playTracks, locked: lock !== null, lockTracks, unlockTracks }), [safeCurrent, tracks, duration, playing, time, volume, playPause, next, previous, seek, setVolume, toggleMute, openWidget, playTrackBySlug, playTracks, lock, lockTracks, unlockTracks]);

  return (
    <AudioContext.Provider value={value}>
      {children}
      <MusicWidget
        currentTrack={tracks[safeCurrent] ?? staticTracks[0]}
        duration={duration}
        playing={playing}
        time={time}
        volume={volume}
        locked={lock !== null}
        next={next}
        playPause={playPause}
        previous={previous}
        seek={seek}
        setVolume={setVolume}
        toggleMute={toggleMute}
      />
      {/* preload="metadata" streams via HTTP range requests on play, never fetches the full file upfront */}
      <audio ref={audioRef} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onEnded={() => step(1)} />
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const value = useContext(AudioContext);
  if (!value) throw new Error("useAudio must be used within AudioProvider");
  return value;
}
