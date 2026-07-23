// Minimal, dependency-free renderer for lyric/notes markdown: blank-line
// blocks, leading "#"/"##"/"###" headings, and inline [Chord] tags. Builds
// React elements directly (no dangerouslySetInnerHTML, no markdown-it/MDX),
// so arbitrary text can never execute — safe by construction, not by escaping.
import type { ReactNode } from "react";
import styles from "./ChordSheet.module.css";

const CHORD_RE = /\[([^[\]\n]{1,14})\]/g;
const HEADING_RE = /^(#{1,3})\s+(.*)$/;

function renderLine(line: string, chords: boolean, key: number): ReactNode {
  if (!chords || !line.includes("[")) return <span key={key}>{line || " "}</span>;
  const parts: ReactNode[] = [];
  let last = 0;
  let index = 0;
  CHORD_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CHORD_RE.exec(line))) {
    if (match.index > last) parts.push(line.slice(last, match.index));
    parts.push(<b className={styles.chord} key={`c${index++}`}>{match[1]}</b>);
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return <span key={key}>{parts}</span>;
}

export function ChordSheet({ text, chords = false }: { text: string; chords?: boolean }) {
  const blocks = text.trim().split(/\n{2,}/).filter(Boolean);
  return (
    <div className={styles.sheet}>
      {blocks.map((block, blockIndex) => {
        const heading = block.match(HEADING_RE);
        if (heading) {
          const Tag = (`h${Math.min(4, heading[1].length + 2)}`) as "h3" | "h4" | "h5";
          return <Tag className={styles.heading} key={blockIndex}>{heading[2]}</Tag>;
        }
        const lines = block.split("\n");
        return (
          <p className={styles.block} key={blockIndex}>
            {lines.map((line, lineIndex) => (
              <span className={styles.line} key={lineIndex}>{renderLine(line, chords, lineIndex)}</span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
