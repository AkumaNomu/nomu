"use client";

import { useEffect, useRef } from "react";
import { useAudio } from "@/components/music/AudioProvider";

// Starts a post's soundtrack shortly after the page mounts — delayed so the
// route transition finishes before the music cuts in. Fires once per track
// list; leaving the post leaves the music playing.
export function PostSoundtrack({ slugs }: { slugs: readonly string[] }) {
  const { playTracks } = useAudio();
  const fired = useRef<string | null>(null);

  useEffect(() => {
    const key = slugs.join(",");
    if (!key || fired.current === key) return;
    fired.current = key;
    const timer = window.setTimeout(() => playTracks([...slugs]), 450);
    return () => window.clearTimeout(timer);
  });

  return null;
}
