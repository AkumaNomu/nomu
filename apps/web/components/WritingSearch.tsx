"use client";

import Link from "next/link";
import Image from "next/image";
import { useDeferredValue, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Grid2X2, List } from "lucide-react";
import { ArrowIcon, SearchIcon } from "@personal/design-system";
import { Dropdown } from "@/components/ui/Dropdown";
import styles from "@/app/collections.module.css";

export type SearchArticle = { slug: string; title: string; description: string; publishedAt: string; category: string; tags: string[]; cover: string; searchableText: string };

function date(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }

export function WritingSearch({ articles }: { articles: SearchArticle[] }) {
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const categories = useMemo(() => [...new Set(articles.map((article) => article.category))], [articles]);
  const results = useMemo(() => {
    return articles.filter((article) => (category === "all" || article.category === category) && (!deferredQuery || article.searchableText.toLocaleLowerCase().includes(deferredQuery)));
  }, [articles, category, deferredQuery]);

  return <>
    <div className={styles.search}>
      <SearchIcon />
      <label htmlFor="writing-search">Search writing</label>
      <input id="writing-search" type="search" placeholder="Search writing…" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
      <div className={styles.writingActions}>
        <div className={styles.viewToggle} aria-label="Writing view">
          <button type="button" aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><List aria-hidden="true" /></button>
          <button type="button" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}><Grid2X2 aria-hidden="true" /></button>
        </div>
        <Dropdown
          label="Filter writing by category"
          value={category}
          onChange={setCategory}
          options={[{ value: "all", label: "All topics" }, ...categories.map((item) => ({ value: item, label: item }))]}
          classNames={{ root: styles.categoryDropdown, trigger: styles.categoryTrigger, options: styles.categoryOptions, option: styles.categoryOption, optionActive: styles.categoryOptionActive }}
        />
      </div>
    </div>
    <motion.ul layout={!reducedMotion} className={`${styles.list} ${view === "grid" ? styles.listGrid : ""}`} aria-live="polite">
      <AnimatePresence initial={false}>
        {results.map((article, index) => <motion.li layout={reducedMotion ? false : "position"} key={article.slug} className={styles.row} data-edge={index === 0 ? "first" : index === results.length - 1 ? "last" : undefined} initial={reducedMotion ? false : { opacity: 0, y: 12, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reducedMotion ? undefined : { opacity: 0, y: -8, scale: .985 }} transition={{ duration: reducedMotion ? 0 : .24, ease: [0.16, 1, .3, 1], layout: { duration: .32, ease: [0.16, 1, .3, 1] } }}>
          <Link className={styles.rowLink} href={`/writing/${article.slug}`}>
            <span className={styles.cover} aria-hidden="true"><Image src={article.cover} alt="" width={96} height={96} sizes="(max-width: 767px) 72px, 96px" /></span>
            <time className={styles.date} dateTime={article.publishedAt}>{date(article.publishedAt)}</time>
            <span><strong className={styles.title}>{article.title}</strong><span className={styles.description}>{article.description}</span></span>
            <span className={styles.category}>{article.category}</span><ArrowIcon />
          </Link>
        </motion.li>)}
      </AnimatePresence>
    </motion.ul>
    {results.length === 0 ? <p className={styles.empty}>No writing matches “{query}”. Try a title, topic, or tag.</p> : null}
  </>;
}
