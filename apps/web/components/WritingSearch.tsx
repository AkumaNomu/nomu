"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useDeferredValue, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SearchIcon } from "@personal/design-system";
import styles from "@/app/collections.module.css";

export type SearchArticle = { slug: string; title: string; description: string; publishedAt: string; category: string; tags: string[]; cover: string; searchableText: string };

const PAGE_SIZE = 12;

function date(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }

export function WritingSearch({ articles }: { articles: SearchArticle[] }) {
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const categories = useMemo(() => [...new Set(articles.map((article) => article.category))], [articles]);
  const results = useMemo(() => {
    return articles.filter((article) => (category === "all" || article.category === category) && (!deferredQuery || article.searchableText.toLocaleLowerCase().includes(deferredQuery)));
  }, [articles, category, deferredQuery]);

  useEffect(() => { setPage(1); }, [deferredQuery, category]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [results, currentPage]);

  return <>
    <div className={styles.search}>
      <SearchIcon />
      <label htmlFor="writing-search">Search writing</label>
      <input id="writing-search" type="search" placeholder="Search writing…" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
    </div>
    <nav className={styles.categoryList} aria-label="Filter writing by category">
      <ul>
        <li><button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>All topics</button></li>
        {categories.map((item) => <li key={item}><button type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button></li>)}
      </ul>
    </nav>
    <motion.ul layout={!reducedMotion} className={styles.grid} aria-live="polite">
      <AnimatePresence initial={false}>
        {paged.map((article, index) => <motion.li layout={reducedMotion ? false : "position"} key={article.slug} className={styles.card} initial={reducedMotion ? false : { opacity: 0, y: 12, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reducedMotion ? undefined : { opacity: 0, y: -8, scale: .985 }} transition={{ duration: reducedMotion ? 0 : .24, delay: reducedMotion ? 0 : (index % PAGE_SIZE) * 0.03, ease: [0.16, 1, .3, 1], layout: { duration: .32, ease: [0.16, 1, .3, 1] } }}>
          <Link className={styles.cardLink} href={`/writing/${article.slug}`}>
            <span className={styles.cover} aria-hidden="true"><Image src={article.cover} alt="" width={320} height={200} sizes="(max-width: 767px) 100vw, 25vw" /></span>
            <time className={styles.date} dateTime={article.publishedAt}>{date(article.publishedAt)}</time>
            <strong className={styles.title}>{article.title}</strong>
            <span className={styles.description}>{article.description}</span>
            <span className={styles.category}>{article.category}</span>
          </Link>
        </motion.li>)}
      </AnimatePresence>
    </motion.ul>
    {results.length === 0 ? <p className={styles.empty}>No writing matches “{query}”. Try a title, topic, or tag.</p> : null}
    {totalPages > 1 ? <nav className={styles.pagination} aria-label="Writing pagination">
      <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>Prev</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => <button type="button" key={p} aria-current={p === currentPage ? "page" : undefined} onClick={() => setPage(p)}>{p}</button>)}
      <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
    </nav> : null}
  </>;
}
