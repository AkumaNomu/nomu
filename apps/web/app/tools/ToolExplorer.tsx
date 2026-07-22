"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowIcon, SearchIcon } from "@personal/design-system";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dropdown } from "@/components/ui/Dropdown";
import styles from "./page.module.css";
import { QuickAccessGrid } from "./QuickAccessGrid";
import { tools, type ToolKind } from "./tools-data";
export { tools } from "./tools-data";

type Status = "All" | (typeof tools)[number]["status"];
type Category = "All" | (typeof tools)[number]["category"];

const statuses: Status[] = ["All", "Live", "Experimental"];
const categories: Category[] = ["All", ...Array.from(new Set(tools.map((tool) => tool.category)))];

export function ToolExplorer() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("All");
  const [category, setCategory] = useState<Category>("All");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const reduceMotion = useReducedMotion();

  const filteredTools = useMemo(() => tools.filter((tool) => {
    const searchText = `${tool.name} ${tool.description} ${tool.status} ${tool.category}`.toLocaleLowerCase();
    return (!deferredQuery || searchText.includes(deferredQuery))
      && (status === "All" || tool.status === status)
      && (category === "All" || tool.category === category);
  }), [category, deferredQuery, status]);

  return (
    <>
      <section className={styles.featuredTools} aria-labelledby="featured-tools-title">
        <h2 className={styles.sectionLabel} id="featured-tools-title">Featured tools</h2>
        <div className={styles.featuredGrid}>
          {tools.map((tool, index) => (
            <motion.div
              key={tool.slug}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.36, delay: reduceMotion ? 0 : index * 0.045 }}
            >
              <Link className={styles.featuredCard} href={`/tools/${tool.slug}` as Route}>
                <ToolGlyph kind={tool.icon} large />
                <strong>{tool.name}</strong>
                <span className={styles.cardDot} aria-hidden="true" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <QuickAccessGrid />

      <section className={styles.allTools} aria-labelledby="all-tools-title">
        <h2 className={styles.sectionLabel} id="all-tools-title">
          All tools <span className={styles.count} aria-live="polite">{filteredTools.length}</span>
        </h2>

        <div className={styles.controls} aria-label="Tool search and filters">
          <div className={styles.selects}>
            <SelectFilter label="Category" options={categories} value={category} onChange={setCategory} />
            <SelectFilter label="Status" options={statuses} value={status} onChange={setStatus} />
          </div>
          <label className={styles.search}>
            <span className={styles.srOnly}>Search tools</span>
            <SearchIcon />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools…" type="search" />
          </label>
        </div>

        <div className={styles.table}>
          <div className={styles.tableHead} aria-hidden="true">
            <span>Tool</span><span>Category</span><span>Status</span><span />
          </div>
          <motion.div layout={!reduceMotion}>
            <AnimatePresence initial={false} mode="popLayout">
              {filteredTools.map((tool) => (
                <motion.div
                  className={styles.rowShell}
                  key={tool.slug}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                  transition={{ duration: reduceMotion ? 0 : 0.22 }}
                >
                  <Link className={styles.row} href={`/tools/${tool.slug}` as Route}>
                    <span className={styles.toolCell}>
                      <ToolGlyph kind={tool.icon} />
                      <span className={styles.rowCopy}><strong>{tool.name}</strong><span>{tool.description}</span></span>
                    </span>
                    <span className={styles.category} data-label="Category">{tool.category}</span>
                    <span className={styles.status} data-label="Status"><i aria-hidden="true" />{tool.status}</span>
                    <ArrowIcon className={styles.arrow} />
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredTools.length === 0 && <p className={styles.empty} role="status">No matching tools.</p>}
          </motion.div>
        </div>
      </section>
    </>
  );
}

function SelectFilter<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.selectFilter}>
      <span>{label}</span>
      <Dropdown
        label={label}
        value={value}
        options={options.map((option) => ({ value: option, label: option }))}
        onChange={(next) => onChange(next as T)}
        classNames={{ trigger: styles.selectTrigger, options: styles.selectOptions, option: styles.selectOption, optionActive: styles.selectOptionActive }}
      />
    </div>
  );
}

export function ToolGlyph({ kind, large = false }: { kind: ToolKind; large?: boolean }) {
  return (
    <span aria-hidden="true" className={`${styles.glyph} ${large ? styles.glyphLarge : ""}`}>
      {kind === "timer" && <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 4v8l2-5" /></svg>}
      {kind === "contrast" && <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 4v16" /><path className={styles.fill} d="M12 4a8 8 0 0 1 0 16z" /></svg>}
      {kind === "split" && <svg viewBox="0 0 24 24"><path d="M4 8h6l4 8h6M4 16h6l4-8h6" /></svg>}
      {kind === "palette" && <svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect className={styles.fill} x="14" y="14" width="6" height="6" /></svg>}
      {kind === "image" && <svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="1" /><circle cx="8.5" cy="9" r="1.5" /><path d="m5 17 4.5-4 3 2.5 2.5-3 4 4.5" /></svg>}
      {kind === "convert" && <svg viewBox="0 0 24 24"><path d="M5 7h11l-3-3M19 17H8l3 3" /><path d="M16 7l3 3M8 17l-3-3" /></svg>}
      {kind === "download" && <svg viewBox="0 0 24 24"><path d="M12 4v11M8 11l4 4 4-4M5 20h14" /></svg>}
      {kind === "lock" && <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="1" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>}
      {kind === "key" && <svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="3" /><path d="m10 13 8-8M15 8l2 2M17 6l2 2" /></svg>}
      {kind === "monitor" && <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="1" /><path d="M9 20h6M12 16v4" /></svg>}
    </span>
  );
}
