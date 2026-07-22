import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
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
  const { title, description, url, type } = resource.metadata;
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } })();
  const data = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: title,
    description,
    url,
    creator: { "@type": "Person", name: "Nomu" },
  };

  return (
    <article className={`${styles.resource} site-shell`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
      <Link className={styles.backLink} href="/resources"><ArrowLeft aria-hidden="true" size={16} /> All resources</Link>
      <header className={styles.header}>
        <span className={styles.badge}>{typeLabel[type]}</span>
        <h1>{title}</h1>
      </header>

      <a className={styles.bookmark} href={url} target="_blank" rel="noreferrer">
        {/* Favicon of the linked site — a lightweight preview for the bookmark card. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.favicon} src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`} alt="" width={36} height={36} loading="lazy" />
        <span className={styles.bookmarkText}>
          <span className={styles.bookmarkHost}>{host}</span>
          <span className={styles.bookmarkDesc}>{description}</span>
        </span>
        <span className={styles.bookmarkCta}>Visit <ArrowUpRight aria-hidden="true" size={16} /></span>
      </a>

      <div className={`${styles.body} prose`}><Content /></div>
    </article>
  );
}
