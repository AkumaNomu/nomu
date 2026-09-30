"use client";

import { useEffect, useRef } from "react";
import { PlayIcon } from "@personal/design-system";
import { useAudio } from "@/components/music/AudioProvider";
import styles from "./MusicCue.module.css";

// In-post music marker: `<MusicCue slug="track-slug" label="Optional title" />`.
// Switches to the track the first time it scrolls through the middle of the
// viewport; the pill stays clickable for manual (re)play afterwards.
export function MusicCue({ slug, label }: { slug: string; label?: string }) {
  const { playTrackBySlug, currentSlug } = useAudio();
  const ref = useRef<HTMLButtonElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || fired.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fired.current = true;
          playTrackBySlug(slug);
          observer.disconnect();
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [playTrackBySlug, slug]);

  return (
    <button
      ref={ref}
      type="button"
      className={styles.cue}
      data-active={currentSlug === slug}
      onClick={() => playTrackBySlug(slug)}
      aria-label={`Play ${label ?? slug}`}
    >
      <PlayIcon aria-hidden="true" />
      <span>{label ?? slug}</span>
    </button>
  );
}
