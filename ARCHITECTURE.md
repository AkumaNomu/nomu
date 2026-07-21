# Architecture

## Boundaries

The web app defaults to Server Components. Client boundaries exist only for navigation state, search, audio, animations, and interactive tools. Content pages are statically generated from local MDX.

```text
MDX files -> metadata parser + Zod -> server routes -> semantic HTML
                                              |-> small client islands
shared-scenes -> Next.js face crops
              -> Remotion compositions
```

## Content

`apps/web/lib/content.ts` is the only content access boundary. It reads frontmatter, validates it through `packages/content`, derives reading time, sorts collections, and exposes typed query functions. Static MDX registries keep module imports visible to the Next.js compiler.

## Visual system

Global tokens own color, type scale, page gutters, content width, rule opacity, motion easing, and z-index. Page CSS Modules own composition. Shared scenes return pure SVG with CSS-driven color and cutout variables.

## Runtime state

Only audio crosses routes. `AudioProvider` owns the native `HTMLAudioElement`, selected track, time, volume, and local-storage persistence. Search and tools keep state inside their route.

## Failure behavior

- Invalid MDX metadata fails the build with the document path.
- Pretext failure leaves normal wrapped heading text.
- Reduced motion disables smooth scrolling and scroll-linked transforms.
- Missing browser storage falls back to the first track and default volume.
- Tools validate input locally and announce actionable errors near controls.
