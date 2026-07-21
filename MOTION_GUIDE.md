# Motion guide

## Principles

Motion clarifies hierarchy and continuity. It does not decorate every row. Transform and opacity are the default animated properties, keeping layout stable.

## Ownership

GSAP owns sequenced editorial motion and scroll-linked face geometry. Motion owns component state, menu presence, grouped filters, and press feedback. Lenis owns desktop scroll interpolation. Pretext owns line measurement only. Remotion owns rendered media only.

## GSAP and Lenis

`MotionProvider` registers ScrollTrigger once, creates Lenis only for desktop users without reduced motion, sends Lenis scroll updates to ScrollTrigger, and advances Lenis through the GSAP ticker. Never add a second requestAnimationFrame loop. Route animation components use `gsap.context()` and call `revert()` on cleanup.

## Reduced motion

When `prefers-reduced-motion: reduce` matches:

- Lenis is never instantiated.
- GSAP hero and scroll timelines do not start.
- CSS forces reveal targets visible and removes transforms.
- Motion reads the same user preference through `MotionConfig`.

All information must remain present without JavaScript.

## Timing

- press/hover: 150–220ms
- menu/list transition: 220–300ms
- hero sequence: 550–900ms
- stagger: 35–80ms

Use the shared ease `cubic-bezier(0.22, 1, 0.36, 1)` unless physical spring feedback communicates state more clearly.
