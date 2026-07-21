import type { Metadata } from "next";
import { PromptSplitter } from "@/components/tools/PromptSplitter";
import { ToolShell } from "@/components/tools/ToolShell";

export const metadata: Metadata = { title: "Prompt Splitter", description: "Break long prompts into readable, reusable sections." };

export default function PromptSplitterPage() {
  return <ToolShell title="Prompt Splitter" description="Break long prompts into clear, reusable sections without uploading the text."><PromptSplitter /></ToolShell>;
}
