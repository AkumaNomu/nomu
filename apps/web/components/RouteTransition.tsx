"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import styles from "./RouteTransition.module.css";

const transitionVariants = [
  { enter: "0% 0%", exit: "100% 100%" },
  { enter: "100% 0%", exit: "0% 100%" },
  { enter: "50% 0%", exit: "50% 100%" },
  { enter: "0% 50%", exit: "100% 50%" },
  { enter: "100% 50%", exit: "0% 50%" },
  { enter: "50% 50%", exit: "50% 100%" },
] as const;

type TransitionVariant = (typeof transitionVariants)[number];

const circleClosed = (origin: string) => `circle(0vmax at ${origin})`;
const circleOpen = (origin: string) => `circle(160vmax at ${origin})`;
const transition = { duration: 0.54, ease: [0.76, 0, 0.24, 1] as const };

export function RouteTransition({ children }: Readonly<{ children: React.ReactNode }>) {
  const reducedMotion = useReducedMotion();
  const controls = useAnimationControls();
  const pathname = usePathname();
  const router = useRouter();
  const navigating = useRef(false);
  const previousPathname = useRef(pathname);
  const previousVariantIndex = useRef(-1);
  const activeVariant = useRef<TransitionVariant>(transitionVariants[2]);

  const chooseVariant = useCallback(() => {
    const availableCount = transitionVariants.length - 1;
    const offset = Math.floor(Math.random() * availableCount) + 1;
    const index = (previousVariantIndex.current + offset) % transitionVariants.length;
    previousVariantIndex.current = index;
    activeVariant.current = transitionVariants[index];
    return transitionVariants[index];
  }, []);

  const animatePageEntrance = useCallback(() => {
    const main = document.querySelector<HTMLElement>("#main-content");
    if (!main) return;

    main.animate(
      [
        { opacity: 0.72, transform: "translate3d(0, 16px, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      { duration: 560, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" },
    );

    const elements = Array.from(
      main.querySelectorAll<HTMLElement>(
        ":scope > section, :scope > article, section > header, ul > li, ol > li",
      ),
    ).slice(0, 18);

    elements.forEach((element, index) => {
      element.animate(
        [
          { opacity: 0, transform: "translate3d(0, 10px, 0)" },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ],
        {
          delay: 70 + index * 32,
          duration: 440,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        },
      );
    });
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    if (reducedMotion) {
      navigating.current = false;
      return;
    }

    const reveal = async () => {
      document.body.classList.add("route-transitioning");
      const variant = navigating.current ? activeVariant.current : chooseVariant();
      if (!navigating.current) {
        controls.set({ clipPath: circleClosed(variant.enter) });
        await controls.start({ clipPath: circleOpen(variant.enter), transition });
      }
      animatePageEntrance();
      await controls.start({ clipPath: circleClosed(variant.exit), transition: { ...transition, duration: 0.58 } });
      controls.set({ clipPath: circleClosed(variant.enter) });
      navigating.current = false;
      document.body.classList.remove("route-transitioning");
    };

    void reveal();
  }, [animatePageEntrance, chooseVariant, controls, pathname, reducedMotion]);

  useEffect(() => {
    const onClick = async (event: MouseEvent) => {
      if (reducedMotion || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search) || url.hash) return;

      event.preventDefault();
      event.stopPropagation();
      if (navigating.current) return;
      navigating.current = true;
      document.body.classList.add("route-transitioning");
      document.dispatchEvent(new Event("site:navigation-start"));
      const variant = chooseVariant();
      controls.set({ clipPath: circleClosed(variant.enter) });
      await controls.start({ clipPath: circleOpen(variant.enter), transition });
      router.push(`${url.pathname}${url.search}${url.hash}` as Route);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [chooseVariant, controls, reducedMotion, router]);

  return (
    <>
      <motion.div
        aria-hidden="true"
        className={styles.wipe}
        initial={{ clipPath: circleClosed(transitionVariants[2].enter) }}
        animate={controls}
      />
      {children}
    </>
  );
}
