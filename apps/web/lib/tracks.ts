export type Track = {
  title: string;
  artist: string;
  album: string;
  artwork: string;
  src: string;
};

export const tracks: Track[] = [
  { title: "Quiet System", artist: "Nomu Studies", album: "Working Notes", artwork: "/album-art/quiet-system.svg", src: "/audio/quiet-system.mp3" },
  { title: "Soft Loop", artist: "Nomu Studies", album: "Working Notes", artwork: "/album-art/soft-loop.svg", src: "/audio/soft-loop.mp3" },
  { title: "After Hours", artist: "Nomu Studies", album: "Working Notes", artwork: "/album-art/after-hours.svg", src: "/audio/after-hours.mp3" }
];
