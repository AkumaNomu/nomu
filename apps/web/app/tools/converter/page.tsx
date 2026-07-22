import type { Metadata } from "next";
import { ImageWorkspace } from "@/components/tools/ImageWorkspace";
import { ToolShell } from "@/components/tools/ToolShell";

export const metadata: Metadata = { title: "Converter", description: "Convert image files between PNG, JPEG, and WebP locally in your browser." };

export default function ConverterPage() {
  return <ToolShell title="Converter" description="Convert image files between PNG, JPEG, and WebP without uploading them."><ImageWorkspace mode="convert" /></ToolShell>;
}
