"use client";

import { Play } from "lucide-react";
import { sound } from "@/lib/audio/soundEngine";
import { useAudio } from "./AudioProvider";

export function PlayTrackButton({ slug, className }: { slug: string; className?: string }) {
  const { playTrackBySlug } = useAudio();
  return (
    <button className={className} type="button" onClick={() => { sound.play("tap"); playTrackBySlug(slug); }}>
      <Play aria-hidden="true" size={14} /> Play on site
    </button>
  );
}
