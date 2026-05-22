import Link from "next/link";
import { navItems } from "@/data/archive";
import { SymbolIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

const topNavItems = [
  { label: "Archive", href: "/archive", key: "archive" },
  { label: "Index", href: "/index", key: "index" },
  { label: "About", href: "/about", key: "about" }
] as const;

export function TopNav({ active }: { active?: string }) {
  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <Link href="/" className="top-nav-brand focus-ring">
          The Archive
        </Link>

        <nav className="top-nav-links">
          {topNavItems.map((item) => (
            <Link key={item.href} href={item.href} className={`top-nav-link ${active === item.key ? "top-nav-link-active" : ""}`}>
              {item.label}
            </Link>
          ))}
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
    <aside className="fixed inset-y-0 left-0 z-50 hidden h-full w-52 flex-col border-r-[0.5px] border-border-subtle bg-paper-base/95 backdrop-blur-xl p-5 md:flex">
      <nav className="flex flex-1 flex-col gap-1 pt-2">
        {navItems.map((item) => {
          const isActive = active?.toLowerCase() === item.label.toLowerCase();
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-ring ${
                isActive
                  ? "bg-surface-container text-primary font-medium"
                  : "text-ink-muted hover:bg-surface-container-low hover:text-primary"
              }`}
            >
              <SymbolIcon name={item.icon} className="h-[17px] w-[17px] shrink-0" />
              <span>{item.label}</span>
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
    <footer className="mt-auto w-full border-t-[0.5px] border-border-subtle bg-transparent py-10">
      <div className="mx-auto flex max-w-text-width flex-col items-center gap-5 px-6">
        <nav className="flex flex-wrap justify-center gap-5 sm:gap-8">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs tracking-wide transition-colors hover:text-primary focus-ring ${
                active === item.key ? "text-primary" : "text-ink-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs tracking-wide text-ink-muted">
          © 2026 The Archive
        </p>
      </div>
    </footer>
  );
}
