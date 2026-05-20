import Link from "next/link";
import { formatArchiveDate } from "@/data/archive";
import { SymbolIcon } from "@/components/icons";
import type { ArchiveEntry } from "@/types/archive";

export function ReaderSideRail({
  entry,
  routeHref,
  routeLabel
}: {
  entry: ArchiveEntry;
  routeHref?: string;
  routeLabel?: string;
}) {
  return (
    <aside className="reader-side-rail w-full pb-5 lg:w-[22rem] lg:shrink-0 lg:sticky lg:top-16 lg:h-[calc(100vh-5rem)] lg:pb-0">
      <div className="flex h-full flex-col gap-4">
        <div className="space-y-1.5">
          <p className="text-[0.7rem] tracking-[0.06em] text-ink-muted">{entry.ref}</p>
          <h1 className="text-display-lg-mobile font-display-lg-mobile text-primary lg:text-[2.5rem] lg:leading-[1.06]">
            {entry.title}
          </h1>
          {entry.subtitle ? <p className="font-body-md text-body-md text-ink-muted">{entry.subtitle}</p> : null}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-y-[0.5px] border-border-subtle py-3 text-[0.72rem]">
          <div>
            <dt className="mb-0.5 text-[0.68rem] tracking-[0.06em] text-ink-muted">Type</dt>
            <dd className="font-ui-label text-ui-label text-primary capitalize">{entry.type}</dd>
          </div>
          <div>
            <dt className="mb-0.5 text-[0.68rem] tracking-[0.06em] text-ink-muted">Published</dt>
            <dd className="font-ui-label text-ui-label text-primary">{formatArchiveDate(entry.publishedAt)}</dd>
          </div>
          <div>
            <dt className="mb-0.5 text-[0.68rem] tracking-[0.06em] text-ink-muted">Words</dt>
            <dd className="font-ui-label text-ui-label text-primary">{entry.wordCount.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt className="mb-0.5 text-[0.68rem] tracking-[0.06em] text-ink-muted">Category</dt>
            <dd className="font-ui-label text-ui-label text-primary">{entry.category}</dd>
          </div>
        </dl>

        <p className="line-clamp-3 font-body-md text-body-md text-ink-muted">{entry.excerpt}</p>

        {routeHref && routeLabel ? (
          <Link
            href={routeHref}
            className="mt-auto inline-flex w-max items-center gap-2 rounded-full border-[0.5px] border-border-subtle px-4 py-2 text-[0.8125rem] text-ink-muted transition-colors hover:border-primary hover:text-primary focus-ring"
          >
            {routeLabel}
            <SymbolIcon name="open_in_new" className="text-[15px]" />
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
