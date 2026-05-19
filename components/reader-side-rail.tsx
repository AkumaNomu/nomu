import Link from "next/link";
import { formatArchiveDate } from "@/data/archive";
import { SoundtrackPlayer } from "@/components/soundtrack-player";
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
    <aside className="reader-side-rail border-b-[0.5px] border-border-subtle pb-5 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:border-b-0 lg:border-r-[0.5px] lg:pr-10">
      <div className="flex h-full flex-col gap-4">
        <div className="space-y-2">
          <p className="font-label-caps text-label-caps tracking-[0.2em] text-ink-muted">{entry.ref}</p>
          <h1 className="text-display-lg-mobile font-display-lg-mobile text-primary lg:text-[2.8rem] lg:leading-[1.04]">
            {entry.title}
          </h1>
          {entry.subtitle ? <p className="font-body-md text-body-md text-ink-muted">{entry.subtitle}</p> : null}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y-[0.5px] border-border-subtle py-3 text-[0.72rem] lg:grid-cols-2">
          <div>
            <dt className="font-label-caps text-label-caps mb-1 text-ink-muted">Type</dt>
            <dd className="font-ui-label text-ui-label text-primary">{entry.type}</dd>
          </div>
          <div>
            <dt className="font-label-caps text-label-caps mb-1 text-ink-muted">Published</dt>
            <dd className="font-ui-label text-ui-label text-primary">{formatArchiveDate(entry.publishedAt)}</dd>
          </div>
          <div>
            <dt className="font-label-caps text-label-caps mb-1 text-ink-muted">Words</dt>
            <dd className="font-ui-label text-ui-label text-primary">{entry.wordCount.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt className="font-label-caps text-label-caps mb-1 text-ink-muted">Category</dt>
            <dd className="font-ui-label text-ui-label text-primary">{entry.category}</dd>
          </div>
        </dl>

        <p className="line-clamp-2 font-body-md text-body-md text-ink-muted">{entry.excerpt}</p>

        <SoundtrackPlayer entry={entry} />

        {routeHref && routeLabel ? (
          <Link
            href={routeHref}
            className="mt-auto inline-flex w-max items-center gap-2 border-[0.5px] border-border-subtle px-3 py-2 font-label-caps text-label-caps text-ink-muted transition-colors hover:border-primary hover:text-primary focus-ring"
          >
            {routeLabel}
            <SymbolIcon name="open_in_new" className="text-[17px]" />
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
