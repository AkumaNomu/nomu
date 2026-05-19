import Link from "next/link";
import { navItems } from "@/data/archive";
import { SymbolIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

export function TopNav({ active }: { active?: string }) {
  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <Link href="/" className="top-nav-brand focus-ring">
          THE ARCHIVE
        </Link>

        <nav className="top-nav-links">
          <Link
            href="/index"
            className={`top-nav-link ${active === "index" ? "top-nav-link-active" : ""}`}
          >
            Index
          </Link>
          <Link
            href="/archive"
            className={`top-nav-link ${active === "archive" ? "top-nav-link-active" : ""}`}
          >
            Type
          </Link>
        </nav>

        <div className="top-nav-actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function SideNav({ active }: { active?: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden h-full w-96 flex-col border-r-[0.5px] border-border-subtle bg-paper-base p-10 md:flex">
      <div className="mb-12">
        <Link href="/archive" className="font-headline-md text-headline-md mb-2 block text-primary focus-ring">
          LIBRARY
        </Link>
        <p className="font-label-caps text-label-caps text-ink-muted">Collected Writings</p>
      </div>

      <nav className="flex flex-1 flex-col gap-6">
        {navItems.map((item) => {
          const isActive = active?.toLowerCase() === item.label.toLowerCase();
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group -ml-2 flex w-max items-center gap-4 rounded p-2 transition-colors hover:bg-surface-container-low focus-ring ${
                isActive ? "border-b-[0.5px] border-primary text-primary italic" : "text-ink-muted"
              }`}
            >
              <SymbolIcon name={item.icon} className="h-[18px] w-[18px]" />
              <span className="font-label-caps text-label-caps">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function Footer({ active }: { active?: string }) {
  const items = [
    { label: "About", href: "/about", key: "about" },
    { label: "Archive", href: "/archive", key: "archive" },
    { label: "RSS", href: "/rss.xml", key: "rss" },
    { label: "Colophon", href: "/colophon", key: "colophon" }
  ];

  return (
    <footer className="mt-auto w-full border-t-[0.5px] border-border-subtle bg-transparent py-24">
      <div className="mx-auto flex max-w-text-width flex-col items-center gap-8 px-6">
        <nav className="flex flex-wrap justify-center gap-6 sm:gap-12">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`font-label-caps text-label-caps transition-colors hover:text-primary focus-ring ${
                active === item.key ? "text-primary underline" : "text-ink-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="font-label-caps text-label-caps text-center tracking-widest text-ink-muted">
          © 2026 THE ARCHIVE. BUILT FOR FOCUS.
        </div>
      </div>
    </footer>
  );
}
