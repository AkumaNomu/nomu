import { notFound } from "next/navigation";
import { ReaderLayout } from "@/components/layouts";
import { ReaderSideRail } from "@/components/reader-side-rail";
import { ScrollWordReader } from "@/components/scroll-word-reader";
import { CommentsPanel } from "@/components/comments-panel";
import { getPostBySlug, getPosts } from "@/lib/posts";

export async function generateStaticParams() {
  const posts = await getPosts({ type: "essay" });
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return {
    title: post?.title ?? "Writing",
    description: post?.excerpt
  };
}

export default async function WritingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const allEssays = await getPosts({ type: "essay" });
  const currentIndex = allEssays.findIndex((entry) => entry.slug === post.slug);
  const next = currentIndex >= 0 ? allEssays[currentIndex + 1] : null;

  return (
    <ReaderLayout active="archive" footer={false} immersive>
      <main className="reader-page-shell relative flex min-h-0 flex-1 flex-col gap-8 px-4 py-4 md:px-6 lg:flex-row lg:px-8 lg:py-6">
        <ReaderSideRail entry={post} />

        <section className="flex min-h-0 flex-1 flex-col">
          <ScrollWordReader
            html={post.html}
            nextHref={next ? `/writing/${next.slug}` : undefined}
            nextLabel={next?.title}
          />

          <div className="mt-10">
            <CommentsPanel slug={post.slug} />
          </div>
        </section>
      </main>
    </ReaderLayout>
  );
}
