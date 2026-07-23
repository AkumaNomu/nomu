"use client";

import Link from "next/link";
import Image from "next/image";
import { useDeferredValue, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LayoutGrid, List } from "lucide-react";
import { SearchIcon } from "@personal/design-system";
import styles from "@/app/collections.module.css";

export type SearchArticle = { slug: string; title: string; description: string; publishedAt: string; category: string; tags: string[]; cover: string; searchableText: string };

const PAGE_SIZE = 12;

function date(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }

export function BlogSearch({ articles }: { articles: SearchArticle[] }) {
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const categories = useMemo(() => [...new Set(articles.map((article) => article.category))], [articles]);
  const results = useMemo(() => {
    return articles.filter((article) => (category === "all" || article.category === category) && (!deferredQuery || article.searchableText.toLocaleLowerCase().includes(deferredQuery)));
  }, [articles, category, deferredQuery]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [results, currentPage]);

  return <>
    <div className={styles.search}>
      <SearchIcon />
      <label htmlFor="blog-search">Search blog</label>
      <input id="blog-search" type="search" placeholder="Search blog…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} autoComplete="off" />
    </div>
    <div className={styles.collectionControls}>
      <nav className={styles.categoryList} aria-label="Filter blog by category">
        <ul>
          <li><button type="button" aria-pressed={category === "all"} onClick={() => { setCategory("all"); setPage(1); }}>All topics</button></li>
          {categories.map((item) => <li key={item}><button type="button" aria-pressed={category === item} onClick={() => { setCategory(item); setPage(1); }}>{item}</button></li>)}
        </ul>
      </nav>
      <div className={styles.viewToggle} aria-label="Post view">
        <button type="button" aria-label="Grid view" title="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
          <LayoutGrid aria-hidden="true" />
        </button>
        <button type="button" aria-label="List view" title="List view" aria-pressed={view === "list"} onClick={() => setView("list")}>
          <List aria-hidden="true" />
        </button>
      </div>
    </div>
    <motion.ul layout={!reducedMotion} className={`${styles.grid} ${view === "list" ? styles.list : ""}`} aria-live="polite">
      <AnimatePresence initial={false}>
        {paged.map((article, index) => <motion.li layout={reducedMotion ? false : "position"} key={article.slug} className={styles.card} initial={reducedMotion ? false : { opacity: 0, y: 12, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reducedMotion ? undefined : { opacity: 0, y: -8, scale: .985 }} transition={{ duration: reducedMotion ? 0 : .24, delay: reducedMotion ? 0 : (index % PAGE_SIZE) * 0.03, ease: [0.16, 1, .3, 1], layout: { duration: .32, ease: [0.16, 1, .3, 1] } }}>
          <Link className={styles.cardLink} href={`/blog/${article.slug}`}>
            <span className={styles.cover} aria-hidden="true"><Image src={article.cover} alt="" width={320} height={200} sizes="(max-width: 767px) 100vw, 25vw" /></span>
            <time className={styles.date} dateTime={article.publishedAt}>{date(article.publishedAt)}</time>
            <strong className={styles.title}>{article.title}</strong>
            <span className={styles.description}>{article.description}</span>
            <span className={styles.category}>{article.category}</span>
          </Link>
        </motion.li>)}
      </AnimatePresence>
    </motion.ul>
    {results.length === 0 ? <p className={styles.empty}>No posts match “{query}”. Try a title, topic, or tag.</p> : null}
    {totalPages > 1 ? <nav className={styles.pagination} aria-label="Blog pagination">
      <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>Prev</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => <button type="button" key={p} aria-current={p === currentPage ? "page" : undefined} onClick={() => setPage(p)}>{p}</button>)}
      <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
    </nav> : null}
  </>;
}
