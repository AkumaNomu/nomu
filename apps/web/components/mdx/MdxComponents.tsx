import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { isValidElement, type ComponentPropsWithoutRef, type CSSProperties, type ReactNode } from "react";
import { slugifyHeading } from "@/lib/mdx/headings";
import { CodeBlock } from "./CodeBlock";
import { ZoomableImage } from "./Lightbox";
import { MdxTable } from "./MdxTable";
import { Mermaid } from "./Mermaid";
import styles from "./MdxComponents.module.css";

type ChildrenProps = { children: ReactNode };

export function Callout({ children, title = "Note" }: ChildrenProps & { title?: string }) {
  return <aside className={`${styles.callout} ${styles.content}`}><strong className={styles.calloutTitle}>{title}</strong>{children}</aside>;
}

export function PullQuote({ children, cite }: ChildrenProps & { cite?: string }) {
  return <figure className={styles.pullQuote}><blockquote>{children}</blockquote>{cite ? <figcaption className={styles.caption}>- {cite}</figcaption> : null}</figure>;
}

type FigureProps = Omit<ComponentPropsWithoutRef<"img">, "alt"> & { alt: string; caption?: string };

export function Figure({ caption, alt, ...imageProps }: FigureProps) {
  // MDX figures accept author-controlled dimensions; responsive CSS prevents overflow.
  // ZoomableImage forwards width/height/style props and adds click-to-zoom.
  return <figure className={styles.figure}><ZoomableImage alt={alt} {...imageProps} />{caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}</figure>;
}

export function Gallery({ children, columns = 2 }: ChildrenProps & { columns?: 2 | 3 }) {
  return <div className={styles.gallery} style={{ "--columns": columns } as CSSProperties}>{children}</div>;
}

export function Video({ caption, ...props }: ComponentPropsWithoutRef<"video"> & { caption?: string }) {
  return <figure className={styles.figure}><video className={styles.video} controls playsInline preload="metadata" {...props} />{caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}</figure>;
}

export function CodeDemo({ children, title = "Interactive example" }: ChildrenProps & { title?: string }) {
  return <section className={styles.codeDemo}><div className={styles.codeDemoHeader}>{title}</div><div className={styles.codeDemoPreview}>{children}</div></section>;
}

type EditorialLinkProps = {
  href: Route;
  title: string;
  description?: string;
};

function EditorialLink({ href, title, description }: EditorialLinkProps) {
  return <Link className={styles.linkBlock} href={href}><span><strong>{title}</strong>{description ? <span className={styles.linkDescription}>{description}</span> : null}</span><ArrowRight className={styles.arrow} aria-hidden="true" /></Link>;
}

export function ToolEmbed({ slug, title, description }: Omit<EditorialLinkProps, "href"> & { slug: string }) {
  return <EditorialLink href={`/tools/${slug}` as Route} title={title} description={description} />;
}

export function ProjectLink({ slug, title, description }: Omit<EditorialLinkProps, "href"> & { slug: string }) {
  return <EditorialLink href={`/projects/${slug}` as Route} title={title} description={description} />;
}

export function ArticleLink({ slug, title, description }: Omit<EditorialLinkProps, "href"> & { slug: string }) {
  return <EditorialLink href={`/writing/${slug}` as Route} title={title} description={description} />;
}

export type TimelineEntry = { date: string; title: string; description?: string };

export function Timeline({ entries }: { entries: readonly TimelineEntry[] }) {
  return <ol className={styles.timeline}>{entries.map((entry) => <li className={styles.timelineItem} key={`${entry.date}-${entry.title}`}><time className={styles.timelineDate}>{entry.date}</time><div><strong>{entry.title}</strong>{entry.description ? <div className={styles.linkDescription}>{entry.description}</div> : null}</div></li>)}</ol>;
}

type TableValue = string | number;
type TableColumn = { key: string; label: string; align?: "left" | "right" };

export function DataTable({ caption, columns, rows }: {
  caption: string;
  columns: readonly TableColumn[];
  rows: readonly Record<string, TableValue>[];
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <caption>{caption}</caption>
        <thead><tr>{columns.map((column) => <th key={column.key} scope="col" data-align={column.align ?? "left"}>{column.label}</th>)}</tr></thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{columns.map((column) => <td key={column.key} data-align={column.align ?? "left"}>{row[column.key]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

type ChartPoint = { label: string; value: number };

export function BarChart({ title, data, unit = "" }: { title: string; data: readonly ChartPoint[]; unit?: string }) {
  const max = Math.max(1, ...data.map((point) => point.value));
  return (
    <figure className={styles.chart}>
      <figcaption>{title}</figcaption>
      <div className={styles.barPlot}>
        {data.map((point) => (
          <div className={styles.barRow} key={point.label}>
            <span>{point.label}</span>
            <span className={styles.barTrack}><span style={{ "--bar-width": `${(point.value / max) * 100}%` } as CSSProperties} /></span>
            <strong>{point.value}{unit}</strong>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function LineChart({ id, title, description, data, unit = "" }: {
  id: string;
  title: string;
  description: string;
  data: readonly ChartPoint[];
  unit?: string;
}) {
  const values = data.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(1, max - min);
  const divisor = Math.max(1, data.length - 1);
  const points = data.map((point, index) => `${(index / divisor) * 100},${44 - ((point.value - min) / range) * 38}`).join(" ");
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <figure className={styles.chart}>
      <svg className={styles.linePlot} viewBox="0 0 100 48" preserveAspectRatio="none" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <title id={titleId}>{title}</title>
        <desc id={descriptionId}>{description}</desc>
        <path d="M0 44H100" />
        <polyline points={points} />
      </svg>
      <figcaption>{title}</figcaption>
      <ul className={styles.chartValues}>{data.map((point) => <li key={point.label}><span>{point.label}</span><strong>{point.value}{unit}</strong></li>)}</ul>
    </figure>
  );
}

export function MetricGrid({ items }: { items: readonly { label: string; value: string; note?: string }[] }) {
  return <dl className={styles.metricGrid}>{items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd>{item.note ? <p>{item.note}</p> : null}</div>)}</dl>;
}

export function Aside({ children, title }: ChildrenProps & { title?: string }) {
  return <aside className={`${styles.aside} ${styles.content}`}>{title ? <strong className={styles.eyebrow}>{title}</strong> : null}{children}</aside>;
}

// Flatten heading children (which may include inline formatting) to plain text
// so the generated id matches the TOC slug from lib/mdx/headings.ts.
function headingText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(headingText).join("");
  if (isValidElement(node)) return headingText((node.props as { children?: ReactNode }).children);
  return "";
}

type HeadingTag = "h2" | "h3" | "h4";

function makeHeading(Tag: HeadingTag) {
  function Heading({ children, id, ...props }: ComponentPropsWithoutRef<HeadingTag>) {
    const generatedId = id ?? (slugifyHeading(headingText(children)) || undefined);
    return <Tag id={generatedId} {...props}>{children}</Tag>;
  }
  Heading.displayName = `Mdx${Tag.toUpperCase()}`;
  return Heading;
}

export const mdxComponents = {
  h2: makeHeading("h2"),
  h3: makeHeading("h3"),
  h4: makeHeading("h4"),
  pre: CodeBlock,
  img: ZoomableImage,
  table: MdxTable,
  Mermaid,
  Callout,
  PullQuote,
  Figure,
  Gallery,
  Video,
  CodeDemo,
  ToolEmbed,
  ProjectLink,
  ArticleLink,
  Timeline,
  DataTable,
  BarChart,
  LineChart,
  MetricGrid,
  Aside,
};
