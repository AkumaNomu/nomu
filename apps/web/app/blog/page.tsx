import type { Metadata } from "next";
import { WritingSearch } from "@/components/WritingSearch";
import { getAllWriting } from "@/lib/content";
import styles from "@/app/collections.module.css";

export const metadata: Metadata = { title: "Writing", description: "Thoughts on systems, design, learning, and building in public.", alternates: { canonical: "/writing" } };

export default function WritingPage() {
  const articles = getAllWriting().map((entry) => ({ ...entry.metadata, searchableText: entry.searchableText }));
  return <div className={`${styles.collection} site-shell`}><h1 className="sr-only">Writing</h1><WritingSearch articles={articles} /></div>;
}
