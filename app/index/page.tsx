import { ReaderLayout } from "@/components/layouts";
import { SearchIndex } from "@/components/search-index";
import { getPosts } from "@/lib/posts";

export const metadata = {
  title: "Index Directory"
};

export default async function IndexPage() {
  const entries = await getPosts();

  return (
    <ReaderLayout active="index">
      <main className="library-page flex w-full flex-grow flex-col px-4 py-10 md:px-8 md:py-14 lg:px-12 lg:py-16">
        <SearchIndex entries={entries} />
      </main>
    </ReaderLayout>
  );
}
