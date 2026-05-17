import Link from "next/link";
import { ReaderLayout } from "@/components/layouts";

export default function NotFound() {
  return (
    <ReaderLayout>
      <main className="mx-auto flex min-h-[70vh] max-w-text-width flex-col items-center justify-center px-6 text-center">
        <p className="font-label-caps text-label-caps mb-6 text-ink-muted">404</p>
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary">The page is not in the archive.</h1>
        <Link href="/archive" className="font-label-caps text-label-caps mt-10 border-b-[0.5px] border-primary text-primary focus-ring">
          Return to Library
        </Link>
      </main>
    </ReaderLayout>
  );
}
