import { notFound } from "next/navigation";
import { ReaderLayout } from "@/components/layouts";
import { FadeIn, SoftFloat } from "@/components/motion";
import { getPostBySlug, getPosts } from "@/lib/posts";

export async function generateStaticParams() {
  const fragments = await getPosts({ type: "fragment" });
  return fragments.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return {
    title: post?.title ?? "Fragment",
    description: post?.excerpt
  };
}

export default async function FragmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  return (
    <ReaderLayout active="archive" footerActive="archive">
      <main className="relative z-10 mx-auto flex min-h-[72vh] w-full max-w-text-width flex-1 flex-col items-center justify-center px-6 py-section-gap text-center md:px-margin-page">
        <FadeIn>
          <SoftFloat>
            <article>
              <p className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg mb-8 max-w-text-width text-primary italic">
                &ldquo;{post.quote ?? post.excerpt}&rdquo;
              </p>
              <div className="mx-auto mb-8 h-px w-12 bg-border-subtle" />
              <p className="font-label-caps text-label-caps tracking-[0.2em] text-ink-muted">{post.ref}</p>
            </article>
          </SoftFloat>
        </FadeIn>
      </main>
    </ReaderLayout>
  );
}
