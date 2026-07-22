import type { Metadata } from "next";
import { BlogSearch } from "@/components/BlogSearch";
import { getAllBlog } from "@/lib/content";
import styles from "@/app/collections.module.css";

export const metadata: Metadata = { title: "Blog", description: "Thoughts on systems, design, learning, and building in public.", alternates: { canonical: "/blog" } };

export default function BlogPage() {
  const articles = getAllBlog().map((entry) => ({ ...entry.metadata, searchableText: entry.searchableText }));
  return <div className={`${styles.collection} site-shell`}><h1 className="sr-only">Blog</h1><BlogSearch articles={articles} /></div>;
}
