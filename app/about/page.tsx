import { LibraryLayout } from "@/components/layouts";
import { FadeIn, SoftFloat } from "@/components/motion";
import Image from "next/image";

export const metadata = {
  title: "About"
};

export default function AboutPage() {
  return (
    <LibraryLayout active="About" footerActive="about">
      <div className="mx-auto w-full max-w-content-width px-6 pb-32 pt-12 md:px-margin-page md:pt-32">
        <section className="mb-section-gap grid grid-cols-1 gap-gutter-grid lg:grid-cols-12">
          <FadeIn className="flex flex-col justify-center lg:col-span-7">
            <p className="font-label-caps text-label-caps mb-8 tracking-[0.2em] text-ink-muted">Manifesto 01</p>
            <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg mb-8 leading-tight text-ink-black">
              To catalogue is not merely to store, but to assert that a fragment holds intrinsic weight against the void.
            </h2>
            <div className="max-w-[500px]">
              <p className="font-body-lg text-body-lg mb-6 text-on-surface-variant">
                This space is an intentional friction against the ephemeral nature of digital consumption. It is built for focus, requiring patience and a willingness to sit with text.
              </p>
            </div>
          </FadeIn>

          <SoftFloat className="mt-12 lg:col-span-5 lg:mt-0">
            <div className="aspect-[3/4] w-full border-[0.5px] border-border-subtle bg-surface-container-low p-4">
              <div className="relative h-full w-full">
                <Image
                  alt="Archivist portrait"
                  className="object-cover grayscale opacity-90 mix-blend-multiply"
                  src="https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1200&auto=format&fit=crop"
                  fill
                  sizes="(min-width: 1024px) 28vw, 100vw"
                />
              </div>
              <p className="font-caption text-caption mt-4 text-ink-muted">Fig 1. The archivist in contemplation.</p>
            </div>
          </SoftFloat>
        </section>

        <div className="mb-section-gap h-px w-1/3 bg-border-subtle" />

        <FadeIn>
          <section className="mb-section-gap max-w-text-width">
            <h3 className="font-headline-md text-headline-md mb-12 text-ink-black">The Architecture of Thought</h3>
            <div className="prose-archive">
              <p>
                We treat pixels as paper. The interface is stripped of its modern anxieties: no notifications, no infinite scrolls, no algorithmic nudges.
              </p>
              <p>
                Whitespace is not empty. It is the mortar that holds the typography together. Strict line lengths, hairline borders, and restrained tonal shifts produce an environment that respects attention as finite.
              </p>
            </div>
          </section>
        </FadeIn>
      </div>
    </LibraryLayout>
  );
}
