// Shared heading id generation + table-of-contents tree parsing.
// The slug logic here MUST stay identical to the id logic in the MdxHeading
// component (MdxComponents.tsx) so TOC anchors match rendered heading ids.

export function slugifyHeading(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export type TocNode = {
  id: string;
  text: string;
  level: number;
  children: TocNode[];
};

// Parse h2 headings out of a raw MDX body string. The TOC intentionally only
// surfaces h2s (top-level sections) — h3/h4 still get anchor ids for direct
// linking, but don't clutter the table of contents.
// Fenced code blocks are stripped first so `##` comments inside code are ignored.
export function parseHeadings(body: string): TocNode[] {
  const withoutCode = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "");

  const headingPattern = /^(#{2})\s+(.+?)\s*#*$/gm;
  const flat: TocNode[] = [];

  let match: RegExpExecArray | null;
  while ((match = headingPattern.exec(withoutCode)) !== null) {
    // Strip common inline markdown markers so display + slug match rendered text.
    const text = match[2]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> label
      .replace(/[*_`~]/g, "")
      .trim();
    if (!text) continue;
    flat.push({ level: 2, text, id: slugifyHeading(text), children: [] });
  }

  return flat;
}
