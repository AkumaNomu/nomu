import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { Comments } from "@/components/comments";
import { ArticleReveal } from "@/components/ArticleReveal";
import { SectionRule } from "@/components/editorial";
import { TableOfContents } from "@/components/mdx/TableOfContents";
import { PostReactions } from "@/components/PostReactions";
import { getAllBlog, getBlogBySlug, getBlogSlugs } from "@/lib/content";
import { parseHeadings } from "@/lib/mdx/headings";
import styles from "@/app/article.module.css";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogBySlug(slug);
  if (!article) return {};

  return {
    title: article.metadata.title,
    description: article.metadata.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: article.metadata.title,
      description: article.metadata.description,
      publishedTime: article.metadata.publishedAt,
      modifiedTime: article.metadata.updatedAt,
      tags: article.metadata.tags,
      images: [{ url: article.metadata.cover, alt: "" }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.metadata.title,
      description: article.metadata.description,
      images: [article.metadata.cover],
    },
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`)).toUpperCase();
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getBlogBySlug(slug);
  if (!article) notFound();

  const Content = article.Content;
  const headings = parseHeadings(article.body);
  const related = getAllBlog()
    .filter((entry) => entry.metadata.slug !== slug && (
      entry.metadata.category === article.metadata.category ||
      entry.metadata.tags.some((tag) => article.metadata.tags.includes(tag))
    ))
    .slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.metadata.title,
    description: article.metadata.description,
    image: article.metadata.cover,
    datePublished: article.metadata.publishedAt,
    dateModified: article.metadata.updatedAt ?? article.metadata.publishedAt,
    author: { "@type": "Person", name: "Nomu" },
  };

  return (
    <article className={styles.article}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className={styles.coverHero}>
        <div className={styles.coverFrame}>
          <Image className={styles.coverImage} src={article.metadata.cover} alt="" fill priority sizes="100vw" />
          <div className={styles.coverFade} aria-hidden="true" />
        </div>
        <div className={`${styles.heroInner} site-shell`}>
          <Link className={styles.backLink} href="/blog"><ArrowLeft aria-hidden="true" size={16} /> All posts</Link>
          <div className={styles.headerInner}>
            <div className={styles.meta}>
              <time dateTime={article.metadata.publishedAt}>{formatDate(article.metadata.publishedAt)}</time>
              <span aria-hidden="true">&bull;</span>
              <span className={styles.category}>{article.metadata.category}</span>
              <span aria-hidden="true">&bull;</span>
              <span>{article.metadata.readingTime.toUpperCase()}</span>
            </div>
            <h1>{article.metadata.title}</h1>
            <p className={styles.dek}>{article.metadata.description}</p>
          </div>
        </div>
      </header>

      <div className={`${styles.articleGrid} site-shell`}>
        {headings.length ? (
          <div className={styles.tocColumn}>
            <TableOfContents nodes={headings} />
          </div>
        ) : <div />}
        <div className={`${styles.body} prose`}><ArticleReveal><Content /></ArticleReveal></div>
        <PostReactions slug={slug} />
      </div>

      {related.length ? (
        <aside className={`${styles.related} site-shell`}>
          <SectionRule title="Related Posts" />
          <ul>{related.map((entry) => <li key={entry.metadata.slug}><Link href={`/blog/${entry.metadata.slug}`}><span>{entry.metadata.title}</span><ArrowRight aria-hidden="true" /></Link></li>)}</ul>
        </aside>
      ) : null}

      <div className={`${styles.comments} site-shell`}><Comments slug={slug} /></div>
    </article>
  );
}
