import { Footer, SideNav, TopNav } from "@/components/nav";
import type { ReactNode } from "react";

export function ReaderLayout({
  children,
  active,
  footerActive,
  footer = true,
  immersive = false
}: {
  children: ReactNode;
  active?: string;
  footerActive?: string;
  footer?: boolean;
  immersive?: boolean;
}) {
  return (
    <div className={`flex min-h-screen flex-col bg-background text-ink-black ${immersive ? "h-screen overflow-hidden" : ""}`}>
      <TopNav active={active} />
      {children}
      {footer ? <Footer active={footerActive} /> : null}
    </div>
  );
}

export function LibraryLayout({ children, active = "Essays", footerActive = "archive" }: { children: ReactNode; active?: string; footerActive?: string }) {
  return (
    <div className="min-h-screen bg-paper-base text-primary">
      <SideNav active={active} />
      <main className="flex min-h-screen flex-col md:ml-96">
        <TopNav active="archive" />
        {children}
        <Footer active={footerActive} />
      </main>
    </div>
  );
}
