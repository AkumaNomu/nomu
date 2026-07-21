"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { tracks } from "@/lib/tracks";
import { MusicWidget } from "./MusicWidget";

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
};

const AudioContext = createContext<AudioState | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const track = tracks[current];
    const wasPlaying = !audio.paused;
    audio.src = track.src;
    localStorage.setItem("nomu-player-track", String(current));
    if (wasPlaying) void audio.play();
  }, [current]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const playPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play(); else audio.pause();
  }, []);
  const next = useCallback(() => setCurrent((value) => (value + 1) % tracks.length), []);
  const previous = useCallback(() => setCurrent((value) => (value - 1 + tracks.length) % tracks.length), []);
  const seek = useCallback((value: number) => { if (audioRef.current) audioRef.current.currentTime = value; }, []);
  const setVolume = useCallback((value: number) => { setVolumeState(value); localStorage.setItem("nomu-player-volume", String(value)); }, []);
  const openWidget = playPause;

  const value = useMemo(() => ({ current, duration, playing, time, volume, playPause, next, previous, seek, setVolume, openWidget }), [current, duration, playing, time, volume, playPause, next, previous, seek, setVolume, openWidget]);

  return (
    <AudioContext.Provider value={value}>
      {children}
      <MusicWidget
        currentTrack={tracks[current]}
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
