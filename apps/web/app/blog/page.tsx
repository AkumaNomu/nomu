import type { Metadata } from "next";
import { BlogSearch } from "@/components/BlogSearch";
import { getAllBlog } from "@/lib/content";
import styles from "@/app/collections.module.css";

export const metadata: Metadata = { title: "Blog", description: "Thoughts on systems, design, learning, and building in public.", alternates: { canonical: "/blog" } };

export default function BlogPage() {
  const articles = getAllBlog().map((entry) => ({ ...entry.metadata, searchableText: entry.searchableText }));
  const archived = articles.filter((article) => article.archived);
  const folder = archived.length ? [{ slug: "archived", title: "Archived posts", description: `${archived.length} older posts, kept for reference.`, publishedAt: archived[0].publishedAt, category: "Archive", tags: [] as string[], cover: archived[0].cover, previewCovers: archived.slice(0, 4).map((article) => article.cover), searchableText: "archived older posts folder" }] : [];
  return <div className={`${styles.collection} site-shell`}><h1 className="sr-only">Blog</h1><BlogSearch articles={[...articles.filter((article) => !article.archived), ...folder]} /></div>;
}
