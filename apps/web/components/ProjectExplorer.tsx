"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowIcon, SearchIcon } from "@personal/design-system";
import { Dropdown } from "@/components/ui/Dropdown";
import collections from "@/app/collections.module.css";
import styles from "./ProjectExplorer.module.css";

export type CollectionItem = { slug: string; title: string; description: string; href: string; group?: string; status?: string; icon?: string; searchText?: string };
const statusLabels: Record<string, string> = { planning: "Planning", building: "In progress", shipped: "Shipped", paused: "Paused", archived: "Archived", live: "Live", experimental: "Experimental", guide: "Guide", site: "Site" };

function FilterSelect({ label, value, values, onChange }: { label: string; value: string; values: readonly string[]; onChange: (value: string) => void }) {
  const allLabel = label === "Category" ? "All categories" : label === "Status" ? "All statuses" : "All years";
  const options = ["all", ...values].map((option) => ({ value: option, label: option === "all" ? allLabel : (statusLabels[option] ?? option) }));
  return (
    <Dropdown
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      classNames={{ root: styles.select, trigger: styles.selectTrigger, options: styles.options, option: styles.option, optionActive: styles.optionActive }}
    />
  );
}

export function ProjectExplorer({ items, label, filters = false, groupLabel = "Year" }: { items: CollectionItem[]; label: string; filters?: boolean; groupLabel?: string }) {
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const [status, setStatus] = useState("all");
  const [group, setGroup] = useState("all");
  const groups = useMemo(() => [...new Set(items.flatMap((item) => item.group ? [item.group] : []))], [items]);
  const statuses = useMemo(() => [...new Set(items.flatMap((item) => item.status ? [item.status] : []))], [items]);
  const results = useMemo(() => items.filter((item) => {
    const text = `${item.title} ${item.description} ${item.status ?? ""} ${item.group ?? ""} ${item.searchText ?? ""}`.toLocaleLowerCase();
    return (!deferredQuery || text.includes(deferredQuery)) && (!filters || status === "all" || item.status === status) && (!filters || group === "all" || item.group === group);
  }), [deferredQuery, filters, group, items, status]);

  return <section className={styles.explorer} aria-label={`All ${label}`}>
    <div className={collections.search}><SearchIcon /><label htmlFor={`${label}-search`}>Search {label}</label><input id={`${label}-search`} type="search" placeholder={`Search ${label}…`} value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
      {filters ? <div className={styles.filters}><FilterSelect label="Status" value={status} values={statuses} onChange={setStatus} /><FilterSelect label={groupLabel} value={group} values={groups} onChange={setGroup} /></div> : null}
    </div>
    <motion.ul layout={!reducedMotion} className={collections.projectList} aria-live="polite"><AnimatePresence initial={false} mode="popLayout">{results.map((item, index) => <motion.li layout={!reducedMotion} key={item.slug} className={collections.projectRow} initial={reducedMotion ? false : { opacity: 0, x: index % 2 ? 12 : -12, y: index % 3 === 0 ? 5 : 0 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: reducedMotion ? 0 : 0.28 + (index % 3) * 0.04, ease: index % 2 ? "easeOut" : [0.16, 1, 0.3, 1] }}><Link href={item.href as Route} className={collections.projectLink}>{item.icon ? <Image className={collections.projectIcon} src={item.icon} alt="" width={48} height={48} /> : <span className={collections.projectIconPlaceholder} aria-hidden="true" />}<span className={collections.year}>{item.group ?? ""}</span><span><strong className={collections.title}>{item.title}</strong><span className={collections.description}>{item.description}</span></span><span className={collections.status}>{item.status ? (statusLabels[item.status] ?? item.status) : ""}</span><ArrowIcon /></Link></motion.li>)}</AnimatePresence></motion.ul>
    {results.length === 0 ? <p className={collections.empty}>No {label} match these filters.</p> : null}<output className={styles.srOnly} aria-live="polite">{results.length} {label} shown</output>
  </section>;
}
