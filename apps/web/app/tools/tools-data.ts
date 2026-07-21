export const tools = [
  { slug: "focus-timer", name: "Focus Timer", description: "A minimal timer for deep work sessions.", status: "Live", category: "Focus", icon: "timer" },
  { slug: "contrast-checker", name: "Contrast Checker", description: "Check text contrast for accessibility.", status: "Live", category: "Accessibility", icon: "contrast" },
  { slug: "prompt-splitter", name: "Prompt Splitter", description: "Split long prompts into clear sections.", status: "Experimental", category: "Writing", icon: "split" },
  { slug: "palette-ratio-checker", name: "Palette Ratio Checker", description: "Check contrast balance across a palette.", status: "Experimental", category: "Design", icon: "palette" },
  { slug: "youtube-downloader", name: "YouTube Downloader", description: "Download audio from YouTube in MP3, M4A, or WAV format.", status: "Live", category: "Media", icon: "download" },
] as const;

export type ToolKind = (typeof tools)[number]["icon"];
