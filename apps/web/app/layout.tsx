import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Atkinson_Hyperlegible } from "next/font/google";
import { MotionProvider } from "@/components/MotionProvider";
import { AccountProvider } from "@/components/account/AccountProvider";
import { SoundProvider } from "@/components/audio/SoundProvider";
import { AudioProvider } from "@/components/music/AudioProvider";
import { RouteTransition } from "@/components/RouteTransition";
import { KeyboardShortcuts } from "@/components/Shortcuts";
import { SiteHeader } from "@/components/SiteHeader";
import { ToastProvider } from "@/components/ToastProvider";
import "@/styles/globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomu.dev";
const bodyFont = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-body", display: "swap" });
const appearanceScript = `try{const p=JSON.parse(localStorage.getItem("nomu-appearance")||"{}");const r=document.documentElement;if(p.theme)r.dataset.theme=p.theme;if(p.accent)r.dataset.accent=p.accent;if(p.fontSize)r.dataset.fontSize=p.fontSize}catch{}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Nomu | Build, learn, test, break", template: "%s | Nomu" },
  description: "Experiments, creative work, research ideas, and reflections by Nomu.",
  openGraph: { type: "website", title: "Nomu", description: "I build, learn, test, and break things.", url: siteUrl },
  twitter: { card: "summary_large_image", title: "Nomu", description: "I build, learn, test, and break things." }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${GeistSans.variable} ${bodyFont.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: appearanceScript }} /></head>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <MotionProvider>
          <SoundProvider><ToastProvider><AccountProvider><AudioProvider><KeyboardShortcuts /><RouteTransition><SiteHeader /><main id="main-content">{children}</main></RouteTransition></AudioProvider></AccountProvider></ToastProvider></SoundProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
