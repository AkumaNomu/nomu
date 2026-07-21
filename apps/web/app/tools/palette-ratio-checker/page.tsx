import type { Metadata } from "next";
import { PaletteRatioChecker } from "@/components/tools/PaletteRatioChecker";
import { ToolShell } from "@/components/tools/ToolShell";

export const metadata: Metadata = { title: "Palette Ratio Checker", description: "Compare contrast ratios across a compact color palette." };

export default function PaletteRatioCheckerPage() {
  return <ToolShell title="Palette Ratio Checker" description="Compare every color pair in a palette and find where readable combinations emerge."><PaletteRatioChecker /></ToolShell>;
}
