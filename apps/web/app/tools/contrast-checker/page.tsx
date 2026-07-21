import type { Metadata } from "next";
import { ContrastChecker } from "@/components/tools/ContrastChecker";
import { ToolShell } from "@/components/tools/ToolShell";

export const metadata: Metadata = { title: "Contrast Checker", description: "Check a color pair against WCAG text contrast thresholds." };

export default function ContrastCheckerPage() {
  return <ToolShell title="Contrast Checker" description="Test a color pair against WCAG text contrast thresholds, locally in your browser."><ContrastChecker /></ToolShell>;
}
