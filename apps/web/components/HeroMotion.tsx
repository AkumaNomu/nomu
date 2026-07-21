"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@personal/motion-system";

export function HeroMotion({ children, className }: { children: React.ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current || prefersReducedMotion()) return;
    let cleanup = () => {};
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([gsapModule, triggerModule]) => {
      if (!root.current) return;
      const gsap = gsapModule.gsap;
      gsap.registerPlugin(triggerModule.ScrollTrigger);
      const context = gsap.context(() => {
        gsap.timeline({ defaults: { ease: "power3.out" } })
          .from("[data-pretext] > span, [data-pretext]", { yPercent: 28, opacity: 0, duration: 0.85, stagger: 0.08 })
          .from("[data-reveal]", { y: 20, opacity: 0, duration: 0.55, stagger: 0.08 }, "-=0.5")
          .from("[data-face-motion]", { xPercent: 14, rotate: 4, opacity: 0, duration: 1 }, 0.05);
        gsap.to("[data-face-motion]", { yPercent: 7, rotate: -1, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.7 } });
      }, root);
      cleanup = () => context.revert();
    });
    return () => cleanup();
  }, []);

  return <div ref={root} className={className}>{children}</div>;
}
