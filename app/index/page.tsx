import { ReaderLayout } from "@/components/layouts";
import { SearchIndex } from "@/components/search-index";
import { FadeIn } from "@/components/motion";
import { getPosts } from "@/lib/posts";

export const metadata = {
  title: "Index Directory"
};

export default async function IndexPage() {
  const entries = await getPosts();

  return (
    <ReaderLayout active="index">
      <main className="flex w-full flex-grow flex-col items-center gap-section-gap px-6 py-section-gap md:px-margin-page">
        <FadeIn className="contents">
          <SearchIndex entries={entries} />
        </FadeIn>
      </main>
    </ReaderLayout>
  );
}
