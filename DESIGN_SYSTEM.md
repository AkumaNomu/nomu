# Design system

## Direction

Swiss editorial modernism with restrained, warm materiality. Typography and negative space lead. Face-derived geometry enters from page edges as layout, never as a logo or avatar.

## Tokens

- background: `#f5f3ee`
- foreground: `#090909`
- muted text: `#6f6c66`
- primary rule: `rgba(9, 9, 9, 0.20)`
- soft rule: `rgba(9, 9, 9, 0.10)`
- max canvas: `1440px`
- adaptive gutter: `clamp(1.5rem, 4.6vw, 4.75rem)`

Geist Sans is bundled locally. Display text uses tight tracking and fluid `clamp()` sizes. Body text keeps a readable measure; long-form prose may use a restrained serif fallback only inside article content.

## Grid and rhythm

Desktop compositions reserve roughly three fifths for content and two fifths for cropped geometry. Lists are rows separated by hairlines, not cards. Spacing follows an 8px base rhythm with larger editorial intervals of 48, 64, 96, and 128px.

Mobile uses one column, a page-name/hamburger header, 24–32px gutters, stacked metadata, and at least 44px interactive targets. Abstract shapes remain cropped and never introduce horizontal overflow.

## Components

- `PageHeader`: oversized title, short dek, route-specific face crop
- `FaceField` / `AbstractFaceCrop`: shared SVG scene with variant crops
- `EyeSlit` and `SmileCutout`: standalone negative-space primitives
- `SectionRule`: eyebrow label and optional action
- `EditorialList`: semantic linked rows
- `MobileMenu`: full-screen Motion presence transition
- `MusicPlayer`: native audio control surface using shared route-persistent state

## Constraints

No gradients, shadows, glass, card grids, colored accents, decorative icons, or repeated face badges. Focus rings remain visible. Secondary gray text maintains accessible contrast. Status always includes text, never color alone.
