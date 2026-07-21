import type { Metadata } from "next";
import { FocusTimer } from "@/components/tools/FocusTimer";
import { ToolShell } from "@/components/tools/ToolShell";

export const metadata: Metadata = { title: "Focus Timer", description: "A quiet, adjustable focus and break timer." };

export default function FocusTimerPage() {
  return <ToolShell title="Focus Timer" description="A quiet, adjustable timer for focused work and deliberate breaks."><FocusTimer /></ToolShell>;
}
