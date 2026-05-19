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
      <main className="library-page flex w-full flex-grow flex-col px-4 py-12 md:px-8 md:py-16 lg:px-12 lg:py-20">
        <SearchIndex entries={entries} />
      </main>
    </ReaderLayout>
  );
}
