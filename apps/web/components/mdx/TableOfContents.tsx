import type { TocNode } from "@/lib/mdx/headings";
import styles from "./TableOfContents.module.css";

export function TableOfContents({ nodes }: { nodes: readonly TocNode[] }) {
  if (nodes.length === 0) return null;

  return (
    <nav className={styles.toc} aria-label="Table of contents">
      <p className={styles.headerLabel}>On this page</p>
      <ul className={styles.list}>
        {nodes.map((node) => <li className={styles.item} key={node.id}><a className={styles.link} href={`#${node.id}`} title={node.text}>{node.text}</a></li>)}
      </ul>
    </nav>
  );
}
