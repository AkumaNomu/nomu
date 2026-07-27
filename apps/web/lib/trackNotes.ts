// Per-track editorial content for /music/[slug], keyed by library slug.
//
// `about` — background on the song. `lyrics` — the lyric/chord sheet (plain
// text, rendered by ChordSheet; bracketed [C] [Am] chords are highlighted).
// `comment` — your own note, shown as a pull quote under "From me".
//
// Anything left empty simply doesn't render, and DB rows (admin-managed
// lyrics_md / notes_md) take precedence over what's here.
//
// NOTE: lyrics are left blank on purpose — song lyrics are copyrighted, so they
// have to be pasted in by hand rather than generated. Same for `comment`: it's
// your voice, so it stays empty until you write it.

export type TrackNote = { about?: string; lyrics?: string; comment?: string };

export const trackNotes: Record<string, TrackNote> = {
  "505-unknown-artist": {
    about: "Arctic Monkeys, the closing track of Favourite Worst Nightmare (2007). Starts on a lone organ drone and a whisper, then detonates in the last minute — one of the band's most-covered endings.",
    lyrics: "",
    comment: "",
  },
  "no-surprises-radiohead": {
    about: "Radiohead, from OK Computer (1997), released as a single in early 1998. Glockenspiel over a lullaby guitar figure, with words that go somewhere much darker than the arrangement lets on.",
    lyrics: "",
    comment: "",
  },
  "impostor-syndrome-sidney-gish-topic": {
    about: "Sidney Gish, from No Dogs Allowed (2017) — an album she wrote, played, recorded, and released herself while at college. Loop-pedal bedroom pop with unusually sharp lyrics.",
    lyrics: "",
    comment: "",
  },
  "tonight-you-belong-to-me-unknown-artist": {
    about: "A 1926 Tin Pan Alley song by Billy Rose and Lee David. The 1956 Patience & Prudence recording made it a standard, and the ukulele duet in The Jerk (1979) is why most people know it today.",
    lyrics: "",
    comment: "",
  },
  "nujabes-aruarian-dance-sped-up-sunset": {
    about: "Nujabes, from the Samurai Champloo: Departure soundtrack (2004) — a jazz-guitar loop over brushed drums. This is a sped-up edit, the version that spread around on YouTube.",
    lyrics: "",
    comment: "",
  },
  "chokkai-minako-yoshida-topic": {
    about: "Minako Yoshida — a Japanese singer, songwriter, and arranger who has been central to city pop and Japanese AOR since the mid-1970s.",
    lyrics: "",
    comment: "",
  },
  "shigeo-sekito-topic": {
    about: "Shigeo Sekito, a Japanese electone (electric organ) player whose Special Sound Series records have been rediscovered decades later for their warm, synthetic mood pieces.",
    lyrics: "",
    comment: "",
  },
  "food-court-potsu-topic": {
    about: "A lo-fi beat by potsu — short, loop-based, built out of a dusty jazz sample and not much else.",
    lyrics: "",
    comment: "",
  },
  "opm1-world-s-number-one-oden-store-part-3-extended-v1-zuko": {
    about: "A fan-made extended edit of a One Piece score cue, looped out well past its original length so it can sit under something else.",
    lyrics: "",
    comment: "",
  },
  "aron-table-for-two-official-music-video-itsaronvevo": { about: "", lyrics: "", comment: "" },
  "simple-prod-frith-love-sadkid": { about: "", lyrics: "", comment: "" },
  "it-s-just-you-my-dear-unknown-artist": { about: "", lyrics: "", comment: "" },
};

export function getTrackNote(slug: string): TrackNote {
  return trackNotes[slug] ?? {};
}
