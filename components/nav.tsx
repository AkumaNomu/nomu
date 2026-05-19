import Link from "next/link";
import { navItems } from "@/data/archive";
import { SymbolIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

const topNavItems = [
  { label: "Index", href: "/index", icon: "format_list_bulleted", key: "index" },
  { label: "Archive", href: "/archive", icon: "menu_book", key: "archive" }
] as const;

export function TopNav({ active }: { active?: string }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b-[0.5px] border-border-subtle bg-background/78 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-none items-center justify-between gap-4 px-5 py-4 md:px-8 lg:px-10">
        <Link href="/" className="font-label-caps text-label-caps tracking-[0.22em] text-ink-black focus-ring">
          THE ARCHIVE
        </Link>

        <nav className="flex items-center gap-3 md:gap-4">
          {topNavItems.map((item) => {
            const isActive = active === item.key;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-full border-[0.5px] px-3 py-2 transition-colors duration-300 focus-ring ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-border-subtle text-ink-muted hover:border-primary hover:text-primary"
                }`}
              >
                <SymbolIcon name={item.icon} className="text-[18px]" />
                <span className="font-label-caps text-label-caps">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 text-primary">
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
              className={`group -ml-2 flex w-max items-center gap-4 rounded border-[0.5px] border-transparent p-2 transition-colors hover:border-border-subtle hover:bg-surface-container-low focus-ring ${
                isActive ? "border-b-[0.5px] border-primary text-primary italic" : "text-ink-muted"
              }`}
            >
              <SymbolIcon name={item.icon} className="text-[18px]" />
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
              className={`inline-flex items-center gap-2 font-label-caps text-label-caps transition-colors hover:text-primary focus-ring ${
                active === item.key ? "text-primary underline" : "text-ink-muted"
              }`}
            >
              <SymbolIcon
                name={
                  item.key === "about" ? "info" : item.key === "archive" ? "menu_book" : item.key === "rss" ? "rss_feed" : "description"
                }
                className="text-[17px]"
              />
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
