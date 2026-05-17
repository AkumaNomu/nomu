import { ReaderLayout } from "@/components/layouts";
import { ReaderSideRail } from "@/components/reader-side-rail";
import { ScrollWordReader } from "@/components/scroll-word-reader";
import { getPosts } from "@/lib/posts";

const FALLBACK_HTML = `
  <p>In an age characterized by a relentless stream of totalizing narratives, the fragment emerges not as an incomplete thought, but as a deliberate act of resistance.</p>
  <p>We are conditioned to seek resolution. Yet human experience rarely adheres to such neat geometry.</p>
  <p>Ultimately, the art of the fragment is an exercise in trust.</p>
`;

export default async function HomePage() {
  const posts = await getPosts({ type: "essay" });
  const current = posts[0] ?? null;
  const next = posts[1] ?? null;

  return (
    <ReaderLayout active="archive" footer={false} immersive>
      <main className="reader-page-shell relative z-10 grid w-full flex-1 min-h-0 gap-8 px-4 py-6 md:px-6 lg:grid-cols-[minmax(26rem,38vw)_minmax(0,1fr)] lg:px-8 lg:py-8">
        {current ? (
          <ReaderSideRail
            entry={current}
            routeHref={`/writing/${current.slug}`}
            routeLabel="Open dedicated route"
          />
        ) : null}

        <section className="min-h-0">
          <ScrollWordReader
            html={current?.html ?? FALLBACK_HTML}
            nextHref={next ? `/writing/${next.slug}` : undefined}
            nextLabel={next?.title}
          />
        </section>
      </main>
    </ReaderLayout>
  );
}
