export const motionTokens = {
  fast: 0.18,
  base: 0.28,
  slow: 0.7,
  ease: [0.22, 1, 0.36, 1] as const
};

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
