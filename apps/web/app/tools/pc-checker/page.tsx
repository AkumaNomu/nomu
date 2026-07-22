import type { Metadata } from "next";
import { PcChecker } from "@/components/tools/PcChecker";
import { ToolShell } from "@/components/tools/ToolShell";

export const metadata: Metadata = { title: "PC Checker", description: "Check keyboard input, screen information, and browser capabilities." };

export default function PcCheckerPage() {
  return <ToolShell title="PC Checker" description="Check keyboard input, screen details, and browser capabilities."><PcChecker /></ToolShell>;
}
