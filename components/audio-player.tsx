"use client";

import { useEffect, useRef, useState } from "react";
import { SymbolIcon } from "@/components/icons";

type AudioPlayerProps = {
  src: string;
  title?: string;
  artist?: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, title, artist }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const volume = 0.85;
  const [isMuted, setIsMuted] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onTime() {
      if (!isScrubbing && audio) setCurrentTime(audio.currentTime);
    }
    function onLoaded() {
      if (!audio) return;
      setDuration(audio.duration || 0);
      setIsReady(true);
    }
    function onEnd() {
      setIsPlaying(false);
      setCurrentTime(0);
    }
    function onPlay() {
      setIsPlaying(true);
    }
    function onPause() {
      setIsPlaying(false);
    }

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    audio.volume = volume;

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [isScrubbing, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  function seekToFraction(fraction: number) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const clamped = Math.min(1, Math.max(0, fraction));
    const targetTime = clamped * duration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  }

  function handleScrubPointer(event: React.PointerEvent<HTMLDivElement>) {
    const target = scrubberRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    seekToFraction(fraction);
  }

  function onScrubDown(event: React.PointerEvent<HTMLDivElement>) {
    setIsScrubbing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    handleScrubPointer(event);
  }

  function onScrubMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isScrubbing) return;
    handleScrubPointer(event);
  }

  function onScrubUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isScrubbing) return;
    setIsScrubbing(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const progressFraction = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const progressPercent = `${(progressFraction * 100).toFixed(2)}%`;

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="audio-player-row">
        <button
          type="button"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={togglePlay}
          disabled={!isReady}
          className="audio-player-play"
        >
          <SymbolIcon name={isPlaying ? "pause" : "play_arrow"} className="audio-player-play-icon" />
        </button>

        <div className="audio-player-track">
          {(title || artist) && (
            <div className="audio-player-meta">
              {title ? <span className="audio-player-title">{title}</span> : null}
              {artist ? <span className="audio-player-artist">{artist}</span> : null}
            </div>
          )}

          <div
            ref={scrubberRef}
            className="audio-player-scrubber"
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={currentTime}
            tabIndex={0}
            onPointerDown={onScrubDown}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubUp}
            onPointerCancel={onScrubUp}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                seekToFraction(Math.max(0, progressFraction - 0.02));
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                seekToFraction(Math.min(1, progressFraction + 0.02));
              }
            }}
          >
            <div className="audio-player-scrubber-track">
              <div className="audio-player-scrubber-fill" style={{ width: progressPercent }} />
            </div>
            <div className="audio-player-scrubber-thumb" style={{ left: progressPercent }} />
          </div>

          <div className="audio-player-times">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <button
          type="button"
          aria-label={isMuted ? "Unmute" : "Mute"}
          onClick={() => setIsMuted((current) => !current)}
          className="audio-player-mute"
        >
          <SymbolIcon
            name={isMuted ? "volume_off" : volume < 0.5 ? "volume_down" : "volume_up"}
            className="audio-player-mute-icon"
          />
        </button>
      </div>
    </div>
  );
}
