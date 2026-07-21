import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { SectionRule } from "@/components/editorial";
import { getAllWriting, getProjectBySlug, getProjectSlugs } from "@/lib/content";
import styles from "@/app/project.module.css";

type Props = { params: Promise<{ slug: string }> };

const statusLabel = {
  planning: "Planning",
  building: "In progress",
  shipped: "Shipped",
  paused: "Paused",
  archived: "Archived",
} as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return getProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  const image = `/projects/${slug}/cover.png`;
  return project ? {
    title: project.metadata.title,
    description: project.metadata.description,
    alternates: { canonical: `/projects/${slug}` },
    openGraph: {
      title: project.metadata.title,
      description: project.metadata.description,
      images: [{ url: image, alt: "" }],
    },
  } : {};
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  const image = `/projects/${slug}/cover.png`;

  const Content = project.Content;
  const related = getAllWriting()
    .filter((entry) => entry.metadata.tags.some((tag) => project.metadata.technologies.some((technology) => technology.toLowerCase().includes(tag.toLowerCase()))))
    .slice(0, 3);
  const data = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.metadata.title,
    description: project.metadata.description,
    dateCreated: String(project.metadata.year),
    image,
    creator: { "@type": "Person", name: "Nomu" },
    url: project.metadata.website,
  };

  return (
    <article className={`${styles.project} site-shell`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <Image src={image} alt="" width={112} height={112} />
          <h1>{project.metadata.title}</h1>
        </div>
        <p className={styles.summary}>{project.metadata.description}</p>
        <dl className={styles.meta}>
          <div><dt>Role</dt><dd>{project.metadata.role ?? "Independent"}</dd></div>
          <div><dt>Year</dt><dd>{project.metadata.year}</dd></div>
          <div><dt>Status</dt><dd>{statusLabel[project.metadata.status]}</dd></div>
          <div className={styles.tech}><dt>Technologies</dt><dd><ul>{project.metadata.technologies.map((technology) => <li key={technology}>{technology}</li>)}</ul></dd></div>
        </dl>
        <div className={styles.links}>
          {project.metadata.website ? <a href={project.metadata.website}>Visit project <ArrowUpRight aria-hidden="true" size={16} /></a> : null}
          {project.metadata.repository ? <a href={project.metadata.repository}>Repository <ArrowUpRight aria-hidden="true" size={16} /></a> : null}
        </div>
      </header>
      <div className={styles.frames} aria-label={`${project.metadata.title} interface studies`}>
        <figure className={styles.frame}><strong>{project.metadata.title} / interface</strong><span /><span /><span /></figure>
        <figure className={styles.frame}><strong>Working study</strong><span /><span /></figure>
      </div>
      <div className={styles.body}><Content /></div>
      {related.length ? (
        <aside className={styles.related}>
          <SectionRule title="Related Writing" />
          <ul>{related.map((entry) => <li key={entry.metadata.slug}><Link href={`/writing/${entry.metadata.slug}`}><span>{entry.metadata.title}</span><ArrowRight aria-hidden="true" /></Link></li>)}</ul>
        </aside>
      ) : null}
    </article>
  );
}
