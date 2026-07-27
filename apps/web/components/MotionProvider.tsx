"use client";

import { useEffect } from "react";
import { MotionConfig } from "motion/react";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!desktop.matches || reduced.matches) return;

    let cleanup = () => {};
    void Promise.all([import("lenis"), import("gsap"), import("gsap/ScrollTrigger")]).then(([lenisModule, gsapModule, triggerModule]) => {
      const Lenis = lenisModule.default;
      const gsap = gsapModule.gsap;
      const ScrollTrigger = triggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ anchors: true });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (seconds: number) => lenis.raf(seconds * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      // Lenis owns native scroll and re-asserts its own animated position every
      // frame, so a plain window.scrollBy() (e.g. marquee-drag auto-scroll)
      // gets silently overwritten — anything that needs to scroll the page
      // programmatically has to go through this instance instead.
      window.__lenis = lenis;
      cleanup = () => { gsap.ticker.remove(tick); lenis.destroy(); delete window.__lenis; };
    });
    return () => cleanup();
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
