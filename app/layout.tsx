import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import "katex/dist/katex.min.css";
import { getThemeBootstrapScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "The Archive",
    template: "%s | The Archive"
  },
  description: "A slow, tactile publishing system for essays, fragments, and archival notes.",
  metadataBase: new URL("https://example.com"),
  openGraph: {
    title: "The Archive",
    description: "A slow, tactile publishing system for essays, fragments, and archival notes.",
    type: "website"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf9f4"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }} />
      </head>
      <body className="grain-overlay">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
