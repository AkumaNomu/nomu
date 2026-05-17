import Link from "next/link";
import Image from "next/image";
import { formatArchiveDate, roman } from "@/data/archive";
import type { ArchiveEntry } from "@/types/archive";
import { SymbolIcon } from "@/components/icons";
import { SlowHover } from "@/components/motion";

export function FeaturedArticle({ entry }: { entry: ArchiveEntry }) {
  return (
    <article className="group flex cursor-pointer flex-col md:col-span-8">
      <Link href={`/writing/${entry.slug}`} className="focus-ring">
        <SlowHover>
          <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden border-[0.5px] border-border-subtle bg-surface-container-high">
            {entry.coverImage ? (
              <Image
                src={entry.coverImage}
                alt={entry.coverAlt ?? "Archive cover image"}
                fill
                sizes="(min-width: 768px) 66vw, 100vw"
                className="object-cover grayscale opacity-80 transition-all duration-[1400ms] ease-out group-hover:scale-[1.02] group-hover:opacity-100"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface-container-high text-ink-muted">
                <span className="font-label-caps text-label-caps">No image</span>
              </div>
            )}
          </div>
        </SlowHover>
      </Link>

      <div className="flex flex-col">
        <div className="mb-4 flex items-center gap-4">
          <span className="font-label-caps text-label-caps text-ink-muted">01</span>
          <div className="h-px w-12 bg-border-subtle" />
          <span className="font-label-caps text-label-caps text-ink-muted">{entry.category}</span>
        </div>
        <Link href={`/writing/${entry.slug}`} className="focus-ring">
          <h3 className="font-headline-md text-headline-md mb-4 text-primary transition-all duration-500 group-hover:italic">
            {entry.title}
          </h3>
        </Link>
        <p className="font-body-md text-body-md line-clamp-3 text-ink-muted">{entry.excerpt}</p>
      </div>
    </article>
  );
}

export function CompactArticleCard({ entry, index }: { entry: ArchiveEntry; index: number }) {
  return (
    <article className="group flex flex-1 cursor-pointer flex-col border-[0.5px] border-border-subtle bg-surface p-8 transition-colors duration-500 hover:bg-surface-container-low">
      <Link href={`/writing/${entry.slug}`} className="focus-ring flex h-full flex-col">
        <div className="mb-6 flex items-start justify-between border-b-[0.5px] border-border-subtle pb-4">
          <span className="font-label-caps text-label-caps text-ink-muted">
            {String(index + 2).padStart(2, "0")} / {entry.category}
          </span>
          <SymbolIcon name="north_east" className="text-[16px] text-ink-muted" />
        </div>
        <h3 className="font-headline-md text-headline-md mb-4 text-primary transition-all duration-500 group-hover:italic">
          {entry.title}
        </h3>
        <p className="font-body-md text-body-md text-ink-muted">{entry.excerpt}</p>
      </Link>
    </article>
  );
}

export function SpineItem({ entry, index }: { entry: ArchiveEntry; index: number }) {
  return (
    <Link
      href={entry.type === "fragment" ? `/fragments/${entry.slug}` : `/writing/${entry.slug}`}
      className="group flex flex-col justify-between border-b-[0.5px] border-border-subtle p-6 transition-colors duration-500 last:border-b-0 hover:bg-surface-container-low focus-ring md:flex-row md:items-center md:px-8 md:py-6"
    >
      <div className="flex w-full flex-col gap-2 md:w-2/3 md:flex-row md:items-center md:gap-8">
        <span className="font-label-caps text-label-caps w-12 shrink-0 text-ink-muted">{roman(index)}.</span>
        <h3 className="font-body-lg text-body-lg text-primary transition-all duration-500 group-hover:italic">{entry.title}</h3>
      </div>
      <div className="hidden items-center gap-8 md:flex">
        <span className="font-label-caps text-label-caps text-ink-muted">{formatArchiveDate(entry.publishedAt)}</span>
        <SymbolIcon name="arrow_forward" className="text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}

export function ResultItem({ entry }: { entry: ArchiveEntry }) {
  return (
    <article className="group flex cursor-pointer flex-col gap-4 border-b-[0.5px] border-border-subtle pb-12">
      <Link href={entry.type === "fragment" ? `/fragments/${entry.slug}` : `/writing/${entry.slug}`} className="focus-ring">
        <div className="font-label-caps text-label-caps mb-4 flex items-center gap-4 text-ink-muted">
          <span>REF: {entry.ref}</span>
          <div className="h-px w-8 bg-border-subtle" />
          <span>{entry.year}</span>
        </div>
        <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:gap-12">
          <div className="flex flex-1 flex-col gap-4">
            <h2 className="font-headline-md text-headline-md text-primary transition-all duration-500 group-hover:italic">
              {entry.title}
            </h2>
            <p className="font-body-md text-body-md line-clamp-2 text-on-surface-variant">{entry.excerpt}</p>
          </div>
          {entry.coverImage ? (
            <div className="relative aspect-[3/4] w-full overflow-hidden border-[0.5px] border-border-subtle bg-surface-container-low md:w-48">
              <Image
                src={entry.coverImage}
                alt={entry.coverAlt ?? entry.title}
                fill
                sizes="(min-width: 768px) 12rem, 100vw"
                className="object-cover grayscale opacity-80 transition-all duration-700 group-hover:opacity-100 md:group-hover:grayscale-0"
              />
            </div>
          ) : null}
        </div>
        <div className="font-label-caps text-label-caps mt-6 flex flex-wrap gap-4 text-ink-muted">
          <span className="border-[0.5px] border-border-subtle px-2 py-1">{entry.type}</span>
          {entry.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="border-[0.5px] border-border-subtle px-2 py-1">
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </article>
  );
}
