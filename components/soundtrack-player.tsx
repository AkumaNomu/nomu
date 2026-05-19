"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ArchiveEntry } from "@/types/archive";
import { SymbolIcon } from "@/components/icons";

function getAudioExtension(value: string) {
  const clean = value.split("?")[0]?.toLowerCase() ?? "";
  return clean.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/)?.[1] ?? null;
}

function isPlayableAudioUrl(value: string) {
  if (!value) return false;
  if (value.startsWith("data:audio/")) return true;
  if (value.startsWith("/api/content-assets/")) return true;
  return Boolean(getAudioExtension(value));
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getPlayableSource(entry: ArchiveEntry) {
  if (entry.soundtrackFallbackSrc) {
    return entry.soundtrackFallbackSrc;
  }

  if (entry.soundtrackUrl && isPlayableAudioUrl(entry.soundtrackUrl)) {
    return entry.soundtrackUrl;
  }

  return null;
}

function getSourceLabel(entry: ArchiveEntry) {
  if (!entry.soundtrackUrl) return null;
  if (entry.soundtrackService === "soundcloud") return "Open SoundCloud source";
  return "Open source";
}

export function SoundtrackPlayer({ entry }: { entry: ArchiveEntry }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const source = useMemo(() => getPlayableSource(entry), [entry]);
  const sourceLabel = getSourceLabel(entry);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
    audio.muted = muted;
  }, [muted, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function syncPlayback() {
      const media = audioRef.current;
      if (!media) return;
      setIsPlaying(!media.paused && !media.ended);
    }

    function syncTime() {
      const media = audioRef.current;
      if (!media) return;
      setCurrentTime(media.currentTime);
    }

    function syncMetadata() {
      const media = audioRef.current;
      if (!media) return;
      setDuration(media.duration || 0);
    }

    function syncVolume() {
      const media = audioRef.current;
      if (!media) return;
      setVolume(media.volume);
      setMuted(media.muted);
    }

    audio.addEventListener("play", syncPlayback);
    audio.addEventListener("pause", syncPlayback);
    audio.addEventListener("ended", syncPlayback);
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("loadedmetadata", syncMetadata);
    audio.addEventListener("durationchange", syncMetadata);
    audio.addEventListener("volumechange", syncVolume);

    syncPlayback();
    syncTime();
    syncMetadata();
    syncVolume();

    return () => {
      audio.removeEventListener("play", syncPlayback);
      audio.removeEventListener("pause", syncPlayback);
      audio.removeEventListener("ended", syncPlayback);
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("loadedmetadata", syncMetadata);
      audio.removeEventListener("durationchange", syncMetadata);
      audio.removeEventListener("volumechange", syncVolume);
    };
  }, [source]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!source) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.src = source;
    audio.load();
  }, [source]);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !source) return;

    if (audio.paused) {
      void audio.play();
      return;
    }

    audio.pause();
  }

  function seekBy(delta: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.min(Math.max(audio.currentTime + delta, 0), audio.duration);
  }

  function setSeek(value: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = value;
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
  }

  const progressValue = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasExternalSource = Boolean(entry.soundtrackUrl && !isPlayableAudioUrl(entry.soundtrackUrl));

  return (
    <section className="reader-player border-[0.5px] border-border-subtle bg-surface-container-low/50 p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-label-caps text-label-caps mb-2 text-ink-muted">Listening Room</p>
          <h2 className="font-headline-md text-headline-md text-primary">{entry.soundtrackTitle ?? "Listening companion"}</h2>
          <p className="font-ui-label text-ui-label mt-1 text-ink-muted">{entry.soundtrackArtist ?? "In-site playback"}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {sourceLabel ? (
            <span className="font-label-caps text-label-caps border-[0.5px] border-border-subtle px-2 py-1 text-ink-muted">
              {entry.soundtrackService === "soundcloud" ? "SoundCloud" : "Audio"}
            </span>
          ) : null}
          {entry.soundtrackUrl ? (
            <a
              href={entry.soundtrackUrl}
              target="_blank"
              rel="noreferrer"
              className="font-label-caps text-label-caps inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-primary focus-ring"
            >
              <SymbolIcon name="open_in_new" className="text-[16px]" />
              <span className="hidden sm:inline">{sourceLabel ?? "Source"}</span>
            </a>
          ) : null}
        </div>
      </div>

      {source ? (
        <div className="space-y-4">
          <audio ref={audioRef} preload="metadata" className="sr-only" />

          <div className="reader-player-display border-[0.5px] border-border-subtle bg-background/50 p-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="reader-player-orb" aria-hidden="true" />
                <div>
                  <p className="font-label-caps text-label-caps text-ink-muted">Playback</p>
                  <p className="font-ui-label text-ui-label text-primary">{isPlaying ? "Playing" : "Paused"}</p>
                </div>
              </div>
              <p className="font-label-caps text-label-caps text-ink-muted">
                {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>

            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={Math.max(duration, 0)}
                step="0.1"
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => setSeek(Number(event.target.value))}
                className="reader-audio-slider"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-ink-muted">Progress</span>
                <span className="font-label-caps text-label-caps text-ink-muted">{Math.round(progressValue)}%</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => seekBy(-10)}
                  className="reader-control-button"
                  aria-label="Rewind 10 seconds"
                >
                  <SymbolIcon name="replay_10" />
                </button>
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="reader-control-button reader-control-button--primary"
                  aria-label={isPlaying ? "Pause playback" : "Play playback"}
                >
                  <SymbolIcon name={isPlaying ? "pause" : "play_arrow"} className="text-[22px]" />
                </button>
                <button
                  type="button"
                  onClick={() => seekBy(10)}
                  className="reader-control-button"
                  aria-label="Forward 10 seconds"
                >
                  <SymbolIcon name="forward_10" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="reader-control-button"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  <SymbolIcon name={muted || volume === 0 ? "volume_off" : "volume_up"} />
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={muted ? 0 : volume}
                  onChange={(event) => {
                    const nextVolume = Number(event.target.value);
                    const audio = audioRef.current;
                    if (!audio) return;
                    audio.volume = nextVolume;
                    audio.muted = nextVolume === 0;
                  }}
                  className="reader-volume-slider"
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-[0.5px] border-border-subtle bg-background/40 p-4">
          <p className="font-ui-label text-ui-label text-ink-muted">
            Add a playable `soundtrackFallbackSrc` or a direct audio URL to enable in-site playback.
          </p>
        </div>
      )}

      {hasExternalSource ? (
        <p className="font-ui-label text-ui-label mt-4 text-ink-muted">
          The embedded source is preserved only as metadata. Playback stays inside the site.
        </p>
      ) : null}
    </section>
  );
}
