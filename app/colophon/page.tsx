import { LibraryLayout } from "@/components/layouts";
import { FadeIn } from "@/components/motion";

export const metadata = {
  title: "Colophon"
};

export default function ColophonPage() {
  return (
    <LibraryLayout active="About" footerActive="colophon">
      <main className="mx-auto flex w-full max-w-content-width flex-grow flex-col items-center px-6 pb-section-gap pt-16 md:px-12">
        <div className="w-full max-w-text-width">
          <FadeIn>
            <header className="mb-16 text-center">
              <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg mb-4 text-primary">Colophon</h1>
              <p className="font-body-lg text-body-lg mx-auto max-w-lg text-ink-muted">
                Documentation of the typographic structures, grids, and archival principles governing this space.
              </p>
              <div className="mx-auto mt-8 h-px w-16 bg-border-subtle" />
            </header>
          </FadeIn>

          <FadeIn>
            <section className="mb-section-gap">
              <h2 className="font-headline-md text-headline-md mb-8 border-b-[0.5px] border-border-subtle pb-4 text-primary">
                Typography Specimen
              </h2>
              <div className="space-y-12">
                <div className="border-[0.5px] border-border-subtle bg-surface-container-lowest p-8">
                  <div className="mb-6 flex items-start justify-between border-b-[0.5px] border-border-subtle pb-4">
                    <span className="font-label-caps text-label-caps text-ink-muted">Primary Serif</span>
                    <span className="font-label-caps text-label-caps text-ink-muted">Newsreader</span>
                  </div>
                  <p className="font-display-lg-mobile text-display-lg-mobile mb-4 leading-tight text-primary">
                    Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm
                  </p>
                  <p className="font-body-md text-body-md text-ink-muted">
                    Used for long-form reading, headings, and captions. Selected for a print-like digital texture.
                  </p>
                </div>
                <div className="border-[0.5px] border-border-subtle bg-surface-container-lowest p-8">
                  <div className="mb-6 flex items-start justify-between border-b-[0.5px] border-border-subtle pb-4">
                    <span className="font-label-caps text-label-caps text-ink-muted">Structural Sans</span>
                    <span className="font-label-caps text-label-caps text-ink-muted">Geist</span>
                  </div>
                  <p className="font-ui-label text-ui-label mb-4 uppercase tracking-[0.1em] text-primary">
                    Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm
                  </p>
                  <p className="font-body-md text-body-md text-ink-muted">
                    Used for metadata, labels, navigation, and administrative surfaces.
                  </p>
                </div>
              </div>
            </section>
          </FadeIn>

          <FadeIn>
            <section className="mb-section-gap">
              <h2 className="font-headline-md text-headline-md mb-8 border-b-[0.5px] border-border-subtle pb-4 text-primary">
                Grid & Structure
              </h2>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="relative flex aspect-square flex-col justify-between border-[0.5px] border-border-subtle bg-surface-container-low p-4">
                  <div className="grid h-full grid-cols-4 gap-2 opacity-20">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-full w-full bg-ink-muted" />
                    ))}
                  </div>
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-6">
                    <p className="font-label-caps text-label-caps text-primary">The Column</p>
                    <p className="font-caption text-caption text-ink-muted">Maximum width: 680px for optimal CPL.</p>
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="font-body-lg text-body-lg mb-4 text-primary">
                    The layout relies on whitespace as a defining structural element, drawing from Swiss Modernism and Japanese editorial design.
                  </p>
                  <p className="font-body-md text-body-md text-ink-muted">
                    Elements are positioned within a strict but generous grid, allowing the paper surface to act as the primary organizational tool.
                  </p>
                </div>
              </div>
            </section>
          </FadeIn>

          <FadeIn>
            <section>
              <h2 className="font-headline-md text-headline-md mb-8 border-b-[0.5px] border-border-subtle pb-4 text-primary">
                Technical Principles
              </h2>
              <ul className="space-y-6">
                {[
                  ["01", "Semantic Minimalism", "Decorative elements are minimized so focus stays on content."],
                  ["02", "Tactile Surface", "A global grain overlay softens the digital harshness."],
                  ["03", "Tonal Hierarchy", "Depth is built through background values and hairline borders, not heavy shadows."]
                ].map(([index, title, body]) => (
                  <li key={index} className="flex items-start gap-4">
                    <span className="font-label-caps text-label-caps pt-1 text-ink-muted">{index}</span>
                    <div>
                      <p className="font-ui-label text-ui-label mb-1 font-bold text-primary">{title}</p>
                      <p className="font-body-md text-body-md text-ink-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </FadeIn>
        </div>
      </main>
    </LibraryLayout>
  );
}
