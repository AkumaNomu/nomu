import { LibraryLayout } from "@/components/layouts";
import { CompactArticleCard, FeaturedArticle, SpineItem } from "@/components/cards";
import { FadeIn } from "@/components/motion";
import { getPosts } from "@/lib/posts";

export const metadata = {
  title: "Library"
};

export default async function ArchivePage() {
  const essays = await getPosts({ type: "essay" });
  const fragments = await getPosts({ type: "fragment" });
  const chronicle = await getPosts({ type: "chronicle" });
  const featured = essays.find((entry) => entry.featured) ?? essays[0];
  const compact = essays.filter((entry) => entry.id !== featured?.id).slice(0, 2);
  const spines = [...fragments, ...chronicle].slice(0, 5);

  return (
    <LibraryLayout active="Essays">
      <div className="flex-1 px-6 py-12 md:px-margin-page md:py-16">
        <FadeIn>
          <div className="mb-10 flex items-end justify-between border-b-[0.5px] border-border-subtle pb-6">
            <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary">Essays</h2>
            <span className="mb-2 hidden text-sm text-ink-muted sm:block">Vol. I — Selection</span>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-gutter-grid">
          {featured ? <FeaturedArticle entry={featured} /> : null}
          <div className="flex flex-col gap-8 md:col-span-4">
            {compact.map((entry, index) => (
              <CompactArticleCard key={entry.id} entry={entry} index={index} />
            ))}
          </div>
        </div>

        <div className="h-section-gap" />

        <FadeIn>
          <div className="mb-10 flex items-end justify-between border-b-[0.5px] border-border-subtle pb-6">
            <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary">Fragments</h2>
          </div>
        </FadeIn>

        <div className="glass glass-sheen glass-radius-lg flex flex-col gap-0 overflow-hidden">
          {spines.map((entry, index) => (
            <SpineItem key={entry.id} entry={entry} index={index} />
          ))}
        </div>
      </div>
    </LibraryLayout>
  );
}
