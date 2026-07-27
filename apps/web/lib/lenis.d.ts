// Minimal shape of the Lenis instance exposed on window by MotionProvider —
// just enough for callers that need to drive scroll programmatically without
// fighting Lenis's own animated position.
export {};

declare global {
  interface Window {
    __lenis?: { scrollTo: (target: number, options?: { immediate?: boolean }) => void };
  }
}
