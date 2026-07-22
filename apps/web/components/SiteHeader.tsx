"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sound } from "@/lib/audio/soundEngine";
import styles from "./SiteHeader.module.css";

const links = [
  { href: "/home", label: "Home" },
  { href: "/writing", label: "Writing" },
  { href: "/projects", label: "Projects" },
  { href: "/tools", label: "Tools" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" }
] as const;

function currentLabel(pathname: string) {
  if (pathname === "/") return "Writing";
  return links.find((link) => pathname.startsWith(link.href))?.label ?? "Nomu";
}

export function SiteHeader() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const upwardTravel = useRef(0);

  useEffect(() => {
    const resetHeader = () => {
      setHidden(false);
    };
    document.addEventListener("site:navigation-start", resetHeader);
    return () => document.removeEventListener("site:navigation-start", resetHeader);
  }, []);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const nextY = window.scrollY;
        const delta = nextY - lastY.current;

        if (nextY < 32) {
          setHidden(false);
          upwardTravel.current = 0;
        } else if (delta > 5 && nextY > 140) {
          setHidden(true);
          upwardTravel.current = 0;
        } else if (delta < 0) {
          upwardTravel.current += Math.abs(delta);
          if (upwardTravel.current > 24) setHidden(false);
        }

        lastY.current = nextY;
        frame = 0;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className={`${styles.header} ${hidden ? styles.hidden : ""}`}>
      <nav className={styles.desktop} aria-label="Primary navigation">
        {links.map((link) => {
          const active = pathname === "/" ? link.href === "/writing" : pathname.startsWith(link.href);
          return <Link key={link.href} href={link.href as Route} className={active ? styles.active : undefined} aria-current={active ? "page" : undefined} onPointerEnter={() => sound.play("hover")}>{link.label}</Link>;
        })}
      </nav>
    </header>
  );
}
