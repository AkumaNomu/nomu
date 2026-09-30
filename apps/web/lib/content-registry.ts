import type { ComponentType } from "react";
import AboutPage from "@/content/pages/about.mdx";
import MaiProject from "@/content/projects/mai.mdx";
import NomuSiteProject from "@/content/projects/nomu-site.mdx";
import ParkerProject from "@/content/projects/parker.mdx";
import TradePilotProject from "@/content/projects/trade-pilot.mdx";
import Fmhy from "@/content/resources/fmhy.mdx";
import PiracyGuide from "@/content/resources/piracy-guide.mdx";
import ContrastCheckerTool from "@/content/tools/contrast-checker.mdx";
import FocusTimerTool from "@/content/tools/focus-timer.mdx";
import PaletteRatioCheckerTool from "@/content/tools/palette-ratio-checker.mdx";
import PromptSplitterTool from "@/content/tools/prompt-splitter.mdx";
import KatexSupport from "@/content/blog/archived/katex-support.mdx";
import MarkdownTestPost from "@/content/blog/archived/markdown-test-post.mdx";
import MergingPaginationMusicSupport from "@/content/blog/archived/merging-pagination-music-support.mdx";
import NomusFirstPost from "@/content/blog/archived/nomus-first-post.mdx";
import NomusV2 from "@/content/blog/archived/nomus-v2.mdx";
import NomusV3 from "@/content/blog/archived/nomus-v3.mdx";
import SoTheyWantToBanPornMyTwoCents from "@/content/blog/so-they-want-to-ban-porn-my-two-cents.mdx";
import TryingToMakePlaylistsFlowBetter from "@/content/blog/archived/trying-to-make-playlists-flow-better.mdx";
import WhyAreStudyAgenciesSuchAScam from "@/content/blog/archived/why-are-study-agencies-such-a-scam.mdx";

export type MdxContent = ComponentType<Record<string, never>>;

export const blogRegistry = {
  "nomus-v3": NomusV3,
  "nomus-v2": NomusV2,
  "why-are-study-agencies-such-a-scam": WhyAreStudyAgenciesSuchAScam,
  "trying-to-make-playlists-flow-better": TryingToMakePlaylistsFlowBetter,
  "merging-pagination-music-support": MergingPaginationMusicSupport,
  "so-they-want-to-ban-porn-my-two-cents": SoTheyWantToBanPornMyTwoCents,
  "katex-support": KatexSupport,
  "nomus-first-post": NomusFirstPost,
  "markdown-test-post": MarkdownTestPost,
} satisfies Record<string, MdxContent>;

export const projectRegistry = {
  mai: MaiProject,
  "nomu-site": NomuSiteProject,
  parker: ParkerProject,
  "trade-pilot": TradePilotProject,
} satisfies Record<string, MdxContent>;

export const resourceRegistry = {
  "piracy-guide": PiracyGuide,
  fmhy: Fmhy,
} satisfies Record<string, MdxContent>;

export const toolRegistry = {
  "focus-timer": FocusTimerTool,
  "contrast-checker": ContrastCheckerTool,
  "prompt-splitter": PromptSplitterTool,
  "palette-ratio-checker": PaletteRatioCheckerTool,
} satisfies Record<string, MdxContent>;

export const pageRegistry = {
  about: AboutPage,
} satisfies Record<string, MdxContent>;
