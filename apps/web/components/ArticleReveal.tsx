"use client";

import { useEffect, useRef } from "react";

const selector = "p, h2, h3, h4, ul, ol, blockquote, pre, figure, hr";

export function ArticleReveal({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = [...(scope.current?.querySelectorAll<HTMLElement>(selector) ?? [])];
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.revealed = "true";
        observer.unobserve(entry.target);
      }),
      { rootMargin: "0px 0px -12%", threshold: 0.08 },
    );

    items.forEach((item) => {
      item.dataset.scrollReveal = "true";
      observer.observe(item);
    });
    return () => observer.disconnect();
  }, []);

  return <div ref={scope}>{children}</div>;
}
