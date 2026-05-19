"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ArchiveEntry } from "@/types/archive";
import { AudioPlayer } from "@/components/audio-player";
import { SymbolIcon } from "@/components/icons";

export function SoundtrackPlayer({ entry }: { entry: ArchiveEntry }) {
  const fallbackSrc = entry.soundtrackFallbackSrc;
  const externalUrl = entry.soundtrackUrl;
  const title = entry.soundtrackTitle ?? "Listening Room";
  const artist = entry.soundtrackArtist;

  if (!fallbackSrc && !externalUrl) {
    return null;
  }

  return (
    <section className="reader-player">
      <div className="reader-player-header">
        <SymbolIcon name="graphic_eq" className="reader-player-glyph" />
        <span className="reader-player-eyebrow">Listening Room</span>
      </div>

      {fallbackSrc ? (
        <AudioPlayer src={fallbackSrc} title={title} artist={artist} />
      ) : externalUrl ? (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="reader-player-external"
        >
          <div className="reader-player-external-text">
            {title ? <span className="reader-player-external-title">{title}</span> : null}
            {artist ? <span className="reader-player-external-artist">{artist}</span> : null}
          </div>
          <SymbolIcon name="open_in_new" className="reader-player-external-icon" />
        </a>
      ) : null}
    </section>
  );
}
