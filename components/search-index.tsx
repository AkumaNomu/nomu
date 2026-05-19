"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ArchiveEntry, EntryType } from "@/types/archive";
import { SymbolIcon } from "@/components/icons";
import { formatArchiveDate, roman } from "@/data/archive";

type FilterValue = EntryType | "all";

const types: Array<{ label: string; value: FilterValue; icon: string }> = [
  { label: "All", value: "all", icon: "library" },
  { label: "Essays", value: "essay", icon: "article" },
  { label: "Fragments", value: "fragment", icon: "auto_stories" },
  { label: "Chronicle", value: "chronicle", icon: "history" }
];

const SPINE_TONES = [
  "#3d3a36",
  "#5b4636",
  "#4a4a48",
  "#3a3f3e",
  "#5a4d3a",
  "#444451",
  "#523c3a",
  "#3a4845"
];

function spineTone(entry: ArchiveEntry) {
  const ref = entry.ref || entry.slug;
  let hash = 0;
  for (let index = 0; index < ref.length; index += 1) {
    hash = (hash * 31 + ref.charCodeAt(index)) >>> 0;
  }
  return SPINE_TONES[hash % SPINE_TONES.length];
}

function spineHref(entry: ArchiveEntry) {
  return entry.type === "fragment" ? `/fragments/${entry.slug}` : `/writing/${entry.slug}`;
}

export function SearchIndex({ entries }: { entries: ArchiveEntry[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<FilterValue>("all");
  const prefersReducedMotion = useReducedMotion();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const typeOk = type === "all" || entry.type === type;
      const queryOk =
        !q ||
        [entry.title, entry.excerpt, entry.category, entry.tags.join(" "), entry.subtitle ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return typeOk && queryOk;
    });
  }, [entries, query, type]);

  const grouped = useMemo(() => {
    const map = new Map<string, ArchiveEntry[]>();
    for (const entry of filtered) {
      const letter = (entry.title[0] ?? "#").toUpperCase();
      const bucket = /[A-Z]/.test(letter) ? letter : "#";
      const list = map.get(bucket) ?? [];
      list.push(entry);
      map.set(bucket, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const decade = useMemo(() => {
    const counts = new Map<number, number>();
    for (const entry of entries) {
      const year = entry.year ?? new Date(entry.publishedAt).getFullYear();
      const bucket = Math.floor(year / 10) * 10;
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort(([a], [b]) => b - a);
  }, [entries]);

  const totalCount = entries.length;
  const showingCount = filtered.length;

  return (
    <div className="library">
      <header className="library-hero">
        <div className="library-hero-eyebrow">
          <SymbolIcon name="library" className="h-3.5 w-3.5" />
          <span>Vol. I · Card Catalog</span>
        </div>
        <h1 className="library-title">The Index</h1>
        <p className="library-tagline">
          A reading room of essays, fragments, and chronicles. Browse the stacks by letter or
          query the catalog.
        </p>

        <div className="library-search glass glass-sheen glass-radius-pill">
          <SymbolIcon name="search" className="library-search-icon" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Query the catalog…"
            className="library-search-input"
            aria-label="Search the catalog"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="library-search-clear"
              aria-label="Clear search"
            >
              <SymbolIcon name="close" className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="library-filter glass glass-sheen glass-radius-pill">
          {types.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setType(item.value)}
              className={`library-filter-pill ${type === item.value ? "library-filter-pill-active" : ""}`}
            >
              <SymbolIcon name={item.icon} className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="library-meta">
          <span className="library-meta-stat">
            <span className="library-meta-stat-value">{showingCount}</span>
            <span className="library-meta-stat-label">showing</span>
          </span>
          <span className="library-meta-divider" />
          <span className="library-meta-stat">
            <span className="library-meta-stat-value">{totalCount}</span>
            <span className="library-meta-stat-label">in stacks</span>
          </span>
        </div>
      </header>

      <section className="library-shelf glass glass-sheen glass-radius-lg">
        <div className="library-shelf-header">
          <span className="library-shelf-eyebrow">On the shelf</span>
          <span className="library-shelf-count">{filtered.length} volumes</span>
        </div>
        <div className="library-shelf-rack" role="list">
          {filtered.length === 0 ? (
            <p className="library-shelf-empty">No volumes match this query.</p>
          ) : (
            filtered.slice(0, 24).map((entry, index) => (
              <motion.div
                key={entry.id}
                role="listitem"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: index * 0.03 }}
                className="library-spine-wrap"
              >
                <Link
                  href={spineHref(entry)}
                  className="library-spine"
                  style={{ backgroundColor: spineTone(entry) }}
                  aria-label={entry.title}
                >
                  <span className="library-spine-title">{entry.title}</span>
                  <span className="library-spine-ref">{entry.ref || roman(index)}</span>
                </Link>
              </motion.div>
            ))
          )}
        </div>
        <div className="library-shelf-board" aria-hidden />
      </section>

      <div className="library-body">
        <aside className="library-aside">
          <div className="library-aside-card glass glass-sheen glass-radius-lg">
            <h3 className="library-aside-heading">Filters</h3>
            <ul className="library-aside-list">
              {types.map((item) => (
                <li key={item.value}>
                  <button
                    type="button"
                    onClick={() => setType(item.value)}
                    className={`library-aside-button ${type === item.value ? "library-aside-button-active" : ""}`}
                  >
                    <SymbolIcon name={item.icon} className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="library-aside-card glass glass-sheen glass-radius-lg">
            <h3 className="library-aside-heading">Decade</h3>
            <ul className="library-aside-list">
              {decade.map(([year, count]) => (
                <li key={year} className="library-aside-row">
                  <span>{year}s</span>
                  <span className="library-aside-count">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="library-catalog">
          {grouped.length === 0 ? (
            <div className="library-empty glass glass-sheen glass-radius-lg">
              <p className="library-empty-title">Nothing on this shelf.</p>
              <p className="library-empty-subtitle">Try a different query or filter.</p>
            </div>
          ) : (
            grouped.map(([letter, items]) => (
              <div key={letter} className="library-section">
                <div className="library-section-header">
                  <span className="library-section-letter">{letter}</span>
                  <span className="library-section-rule" aria-hidden />
                  <span className="library-section-count">
                    {items.length} {items.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
                <ul className="library-section-list">
                  {items.map((entry, index) => (
                    <motion.li
                      key={entry.id}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-8%" }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.02 }}
                    >
                      <Link href={spineHref(entry)} className="library-card glass glass-sheen glass-radius-md">
                        <span className="library-card-ref">{entry.ref}</span>
                        <div className="library-card-body">
                          <h4 className="library-card-title">{entry.title}</h4>
                          {entry.subtitle ? (
                            <p className="library-card-subtitle">{entry.subtitle}</p>
                          ) : null}
                          <p className="library-card-excerpt">{entry.excerpt}</p>
                        </div>
                        <div className="library-card-meta">
                          <span className="library-card-chip">{entry.type}</span>
                          <span className="library-card-date">{formatArchiveDate(entry.publishedAt)}</span>
                        </div>
                        <span className="library-card-arrow" aria-hidden>
                          <SymbolIcon name="north_east" className="h-4 w-4" />
                        </span>
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
