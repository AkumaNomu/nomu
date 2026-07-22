import type { Metadata } from "next";
import { PasswordUtils } from "@/components/tools/PasswordUtils";
import { ToolShell } from "@/components/tools/ToolShell";

export const metadata: Metadata = { title: "Password Utils", description: "Generate strong passwords and check their strength locally." };

export default function PasswordUtilsPage() {
  return <ToolShell title="Password Utils" description="Generate strong passwords and assess password strength locally."><PasswordUtils /></ToolShell>;
}
