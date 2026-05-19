"use client";

import { useState } from "react";
import type { ArchiveEntry, EntryType } from "@/types/archive";
import { ResultItem } from "@/components/cards";
import { SymbolIcon } from "@/components/icons";

const types: Array<{ label: string; value: EntryType | "all" }> = [
  { label: "All", value: "all" },
  { label: "Essays", value: "essay" },
  { label: "Fragments", value: "fragment" },
  { label: "Chronicle", value: "chronicle" }
];

export function SearchIndex({ entries }: { entries: ArchiveEntry[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<EntryType | "all">("all");
  const [letter, setLetter] = useState("A");

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const q = query.trim().toLowerCase();
  const filtered = entries.filter((entry) => {
    const typeOk = type === "all" || entry.type === type;
    const letterOk = letter === "All" || entry.title.toUpperCase().startsWith(letter);
    const queryOk =
      !q ||
      [entry.title, entry.excerpt, entry.category, entry.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q);
    return typeOk && queryOk && (query ? true : letterOk || letter === "All");
  });

  return (
    <>
      <section className="flex w-full max-w-text-width flex-col gap-8">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-center text-primary">
          Index Directory
        </h1>
        <div className="flex items-center gap-4 border-b-[0.5px] border-border-subtle pb-2 transition-colors focus-within:border-primary">
          <span className="material-symbols-outlined text-ink-muted">search</span>
          <input
            className="font-ui-label text-ui-label w-full border-none bg-transparent p-0 text-primary outline-none placeholder:text-ink-muted focus:ring-0"
            placeholder="Query the archive..."
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="font-label-caps text-label-caps flex flex-wrap justify-center gap-4 text-ink-muted">
          <span>SUGGESTED:</span>
          {types.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setType(item.value)}
              className={`inline-flex items-center gap-2 transition-colors hover:text-primary hover:underline underline-offset-4 ${
                type === item.value ? "text-primary italic underline" : ""
              }`}
            >
              <SymbolIcon
                name={item.value === "all" ? "apps" : item.value === "essay" ? "article" : item.value === "fragment" ? "auto_stories" : "history"}
                className="text-[16px]"
              />
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex w-full justify-center border-y-[0.5px] border-border-subtle py-8">
        <div className="font-label-caps text-label-caps flex max-w-[800px] flex-wrap justify-center gap-x-6 gap-y-4 text-ink-muted">
          <button
            type="button"
            className={letter === "All" ? "text-primary italic underline underline-offset-4" : "hover:text-primary"}
            onClick={() => setLetter("All")}
          >
            All
          </button>
          {letters.map((item) => (
            <button
              key={item}
              type="button"
              className={letter === item ? "text-primary italic underline underline-offset-4" : "hover:text-primary"}
              onClick={() => setLetter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="grid w-full grid-cols-1 gap-gutter-grid md:grid-cols-12">
        <aside className="font-label-caps text-label-caps hidden flex-col gap-12 md:col-span-3 md:flex">
          <div className="flex flex-col gap-4 border-t-[0.5px] border-border-subtle pt-4">
            <span className="text-ink-muted">TYPE</span>
            {types.map((item) => (
              <label key={item.value} className="group flex cursor-pointer items-center gap-2">
                <input
                  checked={type === item.value}
                  onChange={() => setType(item.value)}
                  className="h-4 w-4 rounded-none border-border-subtle bg-transparent text-primary focus:ring-0 focus:ring-offset-0"
                  type="radio"
                />
                <span className={`${type === item.value ? "text-primary" : "text-ink-muted"} transition-colors group-hover:text-primary`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-4 border-t-[0.5px] border-border-subtle pt-4">
            <span className="text-ink-muted">DECADE</span>
            <div className="flex flex-col gap-2 text-ink-muted">
              <span>2020s</span>
              <span>2010s</span>
              <span>2000s</span>
            </div>
          </div>
        </aside>

        <div className="col-span-1 flex flex-col gap-12 md:col-span-9">
          {filtered.length > 0 ? (
            filtered.map((entry) => <ResultItem key={entry.id} entry={entry} />)
          ) : (
            <div className="border-[0.5px] border-border-subtle bg-surface p-12 text-center">
              <p className="font-headline-md text-headline-md text-primary">No entries found.</p>
              <p className="font-body-md text-body-md mt-4 text-ink-muted">Try another search term or switch the type filter.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
