# 🚀 NOMU's Blog — Improvement Suggestions

A comprehensive list of recommended improvements, features, and structural changes.

---

## 🏗 Project Structure

### Current state
Everything is flat. As the site grows, files become hard to navigate.

### Recommended structure
```
/
├── index.html
├── config.js              ← NEW: single source of truth
├── css/
│   ├── styles.css
│   └── styles_additions.css
├── js/
│   ├── config.js
│   ├── utils.js
│   ├── loaders.js
│   ├── quickbar.js
│   ├── search.js
│   ├── sounds.js
│   ├── themes.js
│   ├── music.js
│   ├── social.js
│   └── tools/
│       ├── tools.js
│       ├── security.js
│       └── ... (one file per tool)
├── content/
│   ├── content.json
│   ├── posts/
│   ├── projects/
│   └── resources/
└── assets/
    ├── music/
    └── covers/
```

---

## 🎨 UI/UX Improvements

### Discord-inspired
- **Server sidebar** style for category navigation — compact icon-only collapse on narrow viewports
- **Unread badges** that actually pulse when new content is added
- **Hover cards** — preview a post/project on hover before clicking in (like Discord channel preview)
- **Keyboard-first navigation** — `g h` for home, `g b` for blog, `g p` for projects (GitHub-style shortcuts)
- **Status indicator** in the rail header — a small green dot showing "ONLINE" that pulses

### Google Material You-inspired
- **Tonal surface elevation** — cards that lift higher on hover with deeper shadows
- **Ripple effect** on button clicks (pure CSS, no JS needed)
- **Consistent 4px spacing grid** throughout (many places use ad-hoc padding)
- **FAB (Floating Action Button)** on mobile — quick "New search" button

### General
- **Sticky article progress** — thin accent-colored bar at top of article that fills as you scroll
- **Time-to-read progress** shown inside the article alongside the progress bar
- **Back-to-top button** that appears after scrolling 400px
- **Keyboard shortcut cheat sheet** — modal triggered by `?`

---

## ✨ Feature Ideas

### 1. Command Palette (already started with search)
Extend the terminal search into a full command palette:
```
> nav blog          → go to blog
> theme purple      → switch theme
> sfx off           → mute sound effects  
> filter rust       → filter blog by tag
> open rust-parser  → open specific post
```

### 2. Reading Mode
A clean, distraction-free reading mode:
- Hides both rails
- Enlarges font to ~18px with wider line-height
- Adds subtle paper texture
- Toggle with `r` key or a button in the article header

### 3. Post Series / Collections
Group related posts into a "series":
```js
// in config.js
series: [
  { id: 'rust-deep-dives', title: 'Rust Deep Dives', posts: ['rust-parser', 'async-rust'] }
]
```
Show a series banner at the top of each part, with prev/next within the series.

### 4. Reading List / Bookmarks
Using `localStorage`:
- "Save for later" button on every post/resource card
- Dedicated `/reading-list` view
- Export as JSON

### 5. View Counter (client-side estimate)
Track visit counts per post in `localStorage` and display them:
```
👁 347 views (estimated)
```
Not accurate, but adds personality.

### 6. Animated Typing Effect on Hero
```
Hey, I'm Nomu.
I build █     ← cursor
I build dist█
I build distributed systems.
```
With configurable phrases in `config.js`.

### 7. RSS Feed Generator
A pure JS function that generates an RSS XML feed from `DB.posts` and offers it as a downloadable blob. Readers can subscribe.

### 8. Dark/Light Mode Toggle
Currently dark-only. Add a light mode with warm paper tones:
```css
[data-mode="light"] {
  --bg: #f4f1eb;
  --tp: #1a1814;
  /* etc */
}
```

### 9. Post Views by Tag Chart
In the right rail, a tiny bar chart showing which tags you write about most — rendered with a pure CSS/JS sparkline.

### 10. "Now Playing" Twitter Card Meta
When a track is playing, update `<meta name="description">` dynamically so sharing the page includes the track.

---

## 🔧 Code Quality

### Decouple rendering from state
Currently many functions read global state directly. A small reactive store would help:
```js
const store = createStore({
  view: 'home',
  blogFilter: 'all',
  // ...
}, (state, action) => {
  // reducer
});
```

### Event delegation
Instead of `onclick="..."` inline handlers (which are hard to test and debug), use:
```js
document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-action]');
  if (!trigger) return;
  ACTIONS[trigger.dataset.action]?.(trigger.dataset);
});
```

### Tool plugin system
Instead of a giant `switch` in `renderToolPanelBody`, tools should self-register:
```js
registerTool({
  id: 'password',
  name: 'Password Generator',
  render: () => passwordTool(),
  init:   () => {},
});
```

### Error boundaries
Wrap `loadArticle`, `loadProjectDetail`, etc. in try/catch with a friendly fallback UI instead of silently failing.

---

## 📦 Performance

- **Lazy-load images** — already using `loading="lazy"` ✅, but could also add `decoding="async"`
- **Intersection Observer for animations** — only trigger entrance animations when elements enter the viewport
- **Debounce tool search** — currently fires on every keystroke; add 150ms debounce
- **Virtual list for large resource sets** — if resources grow beyond ~50, render only visible ones
- **Service Worker** — cache assets for offline access and snappier repeat visits

---

## 🔒 Security

- **Content Security Policy header** — lock down inline scripts where possible
- **DOMPurify config** — explicitly allowlist the tags/attributes you use in markdown
- **Link safety** — `rel="noopener noreferrer"` on all `target="_blank"` links (some are missing)
- **Input sanitisation** — `escHtml()` in `social.js` is good; ensure it's used consistently

---

## 🌐 SEO & Accessibility

- **`<meta>` tags** — dynamic OG/Twitter card tags per page (title, description, image)
- **`<title>` updates** on navigation — currently stays as "Nomu's"
- **ARIA roles** — add `role="main"`, `role="navigation"`, `aria-current="page"` to active nav
- **Focus management** — when navigating to an article, move focus to the heading
- **Skip link** — `<a href="#main" class="sr-only">Skip to content</a>`
- **Color contrast** — `var(--tm)` at `#3a4e68` on `#030507` background fails WCAG AA at small sizes; lighten to ≥ `#5a7090`

---

## 📱 Mobile

- **Bottom sheet** for the music player on mobile (slide up from bottom, better than current fixed bar)
- **Swipe gestures** on articles — swipe left/right to go to prev/next post
- **Pull-to-refresh** animation (cosmetic, re-fetches content if file-based loader is used)
- **Mobile search** — full-screen takeover rather than the same overlay
