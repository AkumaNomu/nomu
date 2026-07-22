import type { Metadata } from "next";
import { EncryptionTool } from "@/components/tools/EncryptionTool";
import { ToolShell } from "@/components/tools/ToolShell";

export const metadata: Metadata = { title: "Encryption", description: "Encrypt text, create SHA-256 hashes, and Base64 encode data locally." };

export default function EncryptionPage() {
  return <ToolShell title="Encryption" description="Encrypt, hash, and encode text locally in your browser."><EncryptionTool /></ToolShell>;
}
