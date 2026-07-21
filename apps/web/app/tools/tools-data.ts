export const tools = [
  { slug: "focus-timer", name: "Focus Timer", description: "A minimal timer for deep work sessions.", status: "Live", category: "Focus", icon: "timer" },
  { slug: "contrast-checker", name: "Contrast Checker", description: "Check text contrast for accessibility.", status: "Live", category: "Accessibility", icon: "contrast" },
  { slug: "prompt-splitter", name: "Prompt Splitter", description: "Split long prompts into clear sections.", status: "Experimental", category: "Writing", icon: "split" },
  { slug: "reading-time-calculator", name: "Reading Time Calculator", description: "Estimate how long an article will take to read.", status: "Live", category: "Writing", icon: "read" },
  { slug: "palette-ratio-checker", name: "Palette Ratio Checker", description: "Check contrast balance across a palette.", status: "Experimental", category: "Design", icon: "palette" },
] as const;

export type ToolKind = (typeof tools)[number]["icon"];
