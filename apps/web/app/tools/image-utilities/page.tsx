import type { Metadata } from "next";
import { ImageWorkspace } from "@/components/tools/ImageWorkspace";
import { ToolShell } from "@/components/tools/ToolShell";

export const metadata: Metadata = { title: "Image Utilities", description: "Resize, compress, and export image files locally in your browser." };

export default function ImageUtilitiesPage() {
  return <ToolShell title="Image Utilities" description="Resize, compress, and export image files without uploading them."><ImageWorkspace mode="resize" /></ToolShell>;
}
