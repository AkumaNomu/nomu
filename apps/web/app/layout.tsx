import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { MotionProvider } from "@/components/MotionProvider";
import { AudioProvider } from "@/components/music/AudioProvider";
import { RouteTransition } from "@/components/RouteTransition";
import { SiteHeader } from "@/components/SiteHeader";
import { ToastProvider } from "@/components/ToastProvider";
import "@/styles/globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomu.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Nomu | Build, learn, test, break", template: "%s | Nomu" },
  description: "Experiments, creative work, research ideas, and reflections by Nomu.",
  openGraph: { type: "website", title: "Nomu", description: "I build, learn, test, and break things.", url: siteUrl },
  twitter: { card: "summary_large_image", title: "Nomu", description: "I build, learn, test, and break things." }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <MotionProvider>
          <ToastProvider><AudioProvider><RouteTransition><SiteHeader /><main id="main-content">{children}</main></RouteTransition></AudioProvider></ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
