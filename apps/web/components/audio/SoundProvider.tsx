"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { sound, type SoundName } from "@/lib/audio/soundEngine";

type SoundContextValue = {
  play: (name: SoundName | string, opts?: { gain?: number }) => void;
  volume: number;
  muted: boolean;
  enabled: boolean;
  setVolume: (value: number) => void;
  setMuted: (muted: boolean) => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

/**
 * Mounts the shared sound engine: restores saved volume/mute, unlocks the
 * AudioContext on the first user gesture (browsers block audio until then),
 * and disables output while the user prefers reduced motion.
 */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [volume, setVolumeState] = useState(0.6);
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    sound.hydrate();
    setVolumeState(sound.volume);
    setMutedState(sound.muted);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyPreference = () => sound.setEnabled(!media.matches);
    applyPreference();
    media.addEventListener("change", applyPreference);

    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      sound.unlock();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: false });
    window.addEventListener("keydown", unlock, { once: false });

    return () => {
      media.removeEventListener("change", applyPreference);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const play = useCallback((name: SoundName | string, opts?: { gain?: number }) => sound.play(name, opts), []);
  const setVolume = useCallback((value: number) => {
    sound.setVolume(value);
    setVolumeState(sound.volume);
  }, []);
  const setMuted = useCallback((next: boolean) => {
    sound.setMuted(next);
    setMutedState(next);
  }, []);

  const value = useMemo<SoundContextValue>(
    () => ({ play, volume, muted, enabled: sound.enabled, setVolume, setMuted }),
    [play, volume, muted, setVolume, setMuted],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

/** Access the sound engine. Falls back to direct calls if used outside the provider. */
export function useSound(): SoundContextValue {
  const value = useContext(SoundContext);
  if (value) return value;
  return {
    play: (name, opts) => sound.play(name, opts),
    volume: sound.volume,
    muted: sound.muted,
    enabled: sound.enabled,
    setVolume: (v) => sound.setVolume(v),
    setMuted: (m) => sound.setMuted(m),
  };
}
