export const tools = [
  { slug: "focus-timer", name: "Focus Timer", description: "A minimal timer for deep work sessions.", status: "Live", category: "Focus", icon: "timer" },
  { slug: "contrast-checker", name: "Contrast Checker", description: "Check text contrast for accessibility.", status: "Live", category: "Accessibility", icon: "contrast" },
  { slug: "prompt-splitter", name: "Prompt Splitter", description: "Split long prompts into clear sections.", status: "Experimental", category: "Writing", icon: "split" },
  { slug: "palette-ratio-checker", name: "Palette Ratio Checker", description: "Check contrast balance across a palette.", status: "Experimental", category: "Design", icon: "palette" },
  { slug: "image-utilities", name: "Image Utilities", description: "Resize, compress, and export images locally.", status: "Live", category: "Media", icon: "image" },
  { slug: "converter", name: "Converter", description: "Convert image files between PNG, JPEG, and WebP.", status: "Live", category: "Convert", icon: "convert" },
  { slug: "downloader", name: "Downloader", description: "Download audio from YouTube and SoundCloud in your chosen format.", status: "Live", category: "Media", icon: "download" },
  { slug: "encryption", name: "Encryption", description: "Encrypt text, make hashes, and encode data in-browser.", status: "Live", category: "Security", icon: "lock" },
  { slug: "password-utils", name: "Password Utils", description: "Generate strong passwords and check password strength locally.", status: "Live", category: "Security", icon: "key" },
  { slug: "pc-checker", name: "PC Checker", description: "Check keyboard input, screen details, and browser capabilities.", status: "Live", category: "System", icon: "monitor" },
] as const;

export type ToolKind = (typeof tools)[number]["icon"];
