// Track list is generated from ID3 tags embedded in public/audio/*.mp3 — see
// scripts/sync-tracks.mjs. Drop an mp3 in, run `pnpm sync:tracks`, done.
import { generatedTracks } from "./tracks.generated";

export type Track = {
  title: string;
  artist: string;
  album: string;
  artwork: string;
  src: string;
};

export const tracks: Track[] = generatedTracks;
