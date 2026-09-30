import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BlogSearch } from "@/components/BlogSearch";
import { AnimatedGroup, AnimatedItem } from "@/components/motion/AnimatedGroup";
import { getAllBlog } from "@/lib/content";
import styles from "@/app/collections.module.css";

export const metadata: Metadata = { title: "Archived posts", description: "Older posts, kept for reference.", alternates: { canonical: "/blog/archived" } };

export default function ArchivedBlogPage() {
  const articles = getAllBlog().filter((entry) => entry.metadata.archived).map((entry) => ({ ...entry.metadata, searchableText: entry.searchableText }));
  return <div className={`${styles.collection} site-shell`}><AnimatedGroup><AnimatedItem><div className={styles.pageHead}><Link className={styles.backLink} href="/blog"><ArrowLeft aria-hidden="true" size={16} /> All posts</Link><h1 className={styles.pageTitle}>Archived posts</h1><p className={styles.pageDescription}>Older writing, kept for reference. New posts live on the blog.</p></div></AnimatedItem></AnimatedGroup><BlogSearch articles={articles} /></div>;
}
