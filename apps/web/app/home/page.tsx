import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@personal/design-system";
import { AnimatedGroup, AnimatedItem } from "@/components/motion/AnimatedGroup";
import { getAllBlog, getAllProjects, getAllTools } from "@/lib/content";
import styles from "@/app/page.module.css";

export const metadata: Metadata = {
  title: "Home",
  description: "Experiments, creative work, research ideas, and reflections by Nomu.",
  alternates: { canonical: "/home" },
};

const projectStatus = {
  planning: "Planning",
  building: "In progress",
  shipped: "Shipped",
  paused: "Paused",
  archived: "Archived",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function CardHeader({ title, href }: { title: string; href: Route }) {
  return <div className={styles.cardHeader}><h2>{title}</h2><Link href={href} aria-label={`View all ${title.toLowerCase()}`}><ArrowIcon /></Link></div>;
}

export default function HomePage() {
  const blog = getAllBlog().slice(0, 4);
  const projects = getAllProjects().slice(0, 3);
  const tools = getAllTools().slice(0, 3);

  return (
    <div className={`${styles.home} site-shell`}>
      <h1 className="sr-only">Home</h1>
      <AnimatedGroup className={styles.dashboard}>
        <AnimatedItem className={`${styles.card} ${styles.blogCard}`}>
          <CardHeader title="Recent posts" href="/blog" />
          <ul className={styles.blogPreview}>
            {blog.map(({ metadata: entry }) => <li key={entry.slug}><Link href={`/blog/${entry.slug}`}><time dateTime={entry.publishedAt}>{formatDate(entry.publishedAt)}</time><strong>{entry.title}</strong><ArrowIcon /></Link></li>)}
          </ul>
          <Link href="/blog" className={styles.viewAll}>View all posts</Link>
        </AnimatedItem>

        <AnimatedItem className={styles.card}>
          <CardHeader title="Projects" href="/projects" />
          <ul className={styles.compactList}>
            {projects.map(({ metadata: entry }) => <li key={entry.slug}><Link href={`/projects/${entry.slug}` as Route}><Image src={`/projects/${entry.slug}/cover.png`} alt="" width={48} height={48} /><strong>{entry.title}</strong><time>{entry.year}</time><span>{projectStatus[entry.status]}</span><ArrowIcon /></Link></li>)}
          </ul>
          <Link href="/projects" className={styles.viewAll}>View all projects</Link>
        </AnimatedItem>

        <AnimatedItem className={styles.card}>
          <CardHeader title="Custom tools" href="/tools" />
          <ul className={`${styles.compactList} ${styles.toolsPreview}`}>
            {tools.map(({ metadata: entry }, index) => <li key={entry.slug}><Link href={`/tools/${entry.slug}` as Route}><span className={styles.toolMark} aria-hidden="true">{index + 1}</span><strong>{entry.title}</strong><span className={styles.status}><i />{entry.status}</span><ArrowIcon /></Link></li>)}
          </ul>
          <Link href="/tools" className={styles.viewAll}>View all tools</Link>
        </AnimatedItem>
      </AnimatedGroup>
    </div>
  );
}
