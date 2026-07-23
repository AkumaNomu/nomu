"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowIcon, SearchIcon } from "@personal/design-system";
import { Contrast, Download, Image as ImageIcon, Key, Lock, Monitor, Palette, RefreshCw, SplitSquareHorizontal, Timer } from "lucide-react";
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
      {kind === "timer" && <Timer />}
      {kind === "contrast" && <Contrast />}
      {kind === "split" && <SplitSquareHorizontal />}
      {kind === "palette" && <Palette />}
      {kind === "image" && <ImageIcon />}
      {kind === "convert" && <RefreshCw />}
      {kind === "download" && <Download />}
      {kind === "lock" && <Lock />}
      {kind === "key" && <Key />}
      {kind === "monitor" && <Monitor />}
    </span>
  );
}
