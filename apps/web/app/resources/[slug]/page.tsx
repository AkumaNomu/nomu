import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getResourceBySlug, getResourceSlugs } from "@/lib/content";
import styles from "@/app/project.module.css";

type Props = { params: Promise<{ slug: string }> };

const typeLabel = { guide: "Guide", site: "Site" } as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return getResourceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resource = getResourceBySlug(slug);
  return resource ? {
    title: resource.metadata.title,
    description: resource.metadata.description,
    alternates: { canonical: `/resources/${slug}` },
    openGraph: {
      title: resource.metadata.title,
      description: resource.metadata.description,
    },
  } : {};
}

export default async function ResourcePage({ params }: Props) {
  const { slug } = await params;
  const resource = getResourceBySlug(slug);
  if (!resource) notFound();

  const Content = resource.Content;
  const data = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: resource.metadata.title,
    description: resource.metadata.description,
    url: resource.metadata.url,
    creator: { "@type": "Person", name: "Nomu" },
  };

  return (
    <article className={`${styles.project} site-shell`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1>{resource.metadata.title}</h1>
        </div>
        <p className={styles.summary}>{resource.metadata.description}</p>
        <dl className={styles.meta}>
          <div><dt>Type</dt><dd>{typeLabel[resource.metadata.type]}</dd></div>
        </dl>
        <div className={styles.links}>
          <a href={resource.metadata.url} target="_blank" rel="noreferrer">Visit resource <ArrowUpRight aria-hidden="true" size={16} /></a>
        </div>
      </header>
      <div className={`${styles.body} prose`}><Content /></div>
    </article>
  );
}
