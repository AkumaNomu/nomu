import type { Metadata } from "next";
import { ReadingTimeCalculator } from "@/components/tools/ReadingTimeCalculator";
import { ToolShell } from "@/components/tools/ToolShell";

export const metadata: Metadata = { title: "Reading Time Calculator", description: "Estimate reading time from text and reading speed." };

export default function ReadingTimeCalculatorPage() {
  return <ToolShell title="Reading Time Calculator" description="Estimate reading time for an article, note, or draft at a pace you control."><ReadingTimeCalculator /></ToolShell>;
}
