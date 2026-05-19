import { NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { buildMarkdownLookup, compileMarkdown, getAllMarkdownNotes } from "@/lib/markdown";

export async function POST(request: Request) {
  const admin = assertAdminRequest(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const body = await request.json().catch(() => ({}));
  const markdown = typeof body.markdown === "string" ? body.markdown : "";

  // Build the lookup so Obsidian-style links resolve consistently in preview.
  const notes = await getAllMarkdownNotes();
  const noteIndex = buildMarkdownLookup(notes);

  const compiled = await compileMarkdown(markdown, {
    currentFile: "admin-preview.md",
    noteIndex
  });

  return NextResponse.json({ html: compiled.html, plainText: compiled.plainText, wordCount: compiled.wordCount });
}

