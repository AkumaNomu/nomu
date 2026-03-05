/* ================================================================
   CONFIG.JS — Single source of truth for NOMU's blog
   Edit everything here: site info, authors, categories, content DB
================================================================ */

/* ─── SITE META ────────────────────────────────────────────────── */
const SITE_CONFIG = {
  name:       'NOMU\'s',
  tagline:    'Terminal · v3.0',
  author:     'Nomu',
  initials:   'N',
  repo:       'nomu/',
  bio:        'You can see me yap a lot or admire how amazing I am, whatever floats your boat.',
  email:      'akumanomu@proton.me',
  avatar:     null,            // path to avatar image, or null
  logoSrc:    'nomu/assets/Nomu.svg',
  bootLabel:  'NOMU\'s',      // short label for the mobile header
  "social": {
      "github": "https://github.com/AkumaNomu",
      "instagram": "https://instagram.com/akumanomu",
      "linkedin": "https://www.linkedin.com/in/AkumaNomu",
    }
};

/* ─── CONTENT CATEGORIES ───────────────────────────────────────── */
/* Modify or add project categories here */
const PROJECT_CATEGORIES = ['All', 'Development', 'Motion Design', 'Video Editing'];

/* Sub-filters per category (keyed by category name) */
const PROJECT_FOCUS_MAP = {
  'Development': ['All', 'AI', 'Web', 'Systems'],
};

/* Resource types — used to build filter tabs on /resources */
const RESOURCE_TYPES = ['All', 'Book', 'Guide', 'Tutorial', 'Site', 'App', 'Course'];

/* ─── DIFFICULTY COLORS ────────────────────────────────────────── */
const DIFF_COLORS = {
  Beginner:     '#22c55e',
  Intermediate: '#f59e0b',
  Advanced:     '#ef4444',
  Various:      '#8b5cf6',
};

/* ─── THEMES ───────────────────────────────────────────────────── */
/* Each theme: { name, h (hue), s (saturation), l (lightness), c (hex preview) } */
const THEMES = [
  { name: 'Cyan',   h: 175, s: '100%', l: '52%', c: '#00d4b4' },
  { name: 'Purple', h: 265, s: '80%',  l: '62%', c: '#9f6ef7' },
  { name: 'Pink',   h: 328, s: '90%',  l: '62%', c: '#f472b6' },
  { name: 'Orange', h: 25,  s: '95%',  l: '55%', c: '#f97316' },
  { name: 'Green',  h: 145, s: '68%',  l: '47%', c: '#22c55e' },
  { name: 'Gold',   h: 44,  s: '92%',  l: '52%', c: '#eab308' },
  { name: 'Red',    h: 4,   s: '90%',  l: '58%', c: '#ef4444' },
  { name: 'Sky',    h: 200, s: '95%',  l: '52%', c: '#0ea5e9' },
];

/* ─── SOUND PRESETS ─────────────────────────────────────────────── */
/* Tune oscillator layers for each UI event */
const SOUND_PRESETS = {
};

/* ─── BOOT MESSAGES ─────────────────────────────────────────────── */
const BOOT_MESSAGES = [
  `<span>SYS</span> :: Loading kernel modules...`,
  `<span>NET</span> :: Establishing secure connection...`,
  `<span>DB</span>  :: Parsing content manifest...`,
  `<span>UI</span>  :: Rendering interface components...`,
  `<span>SFX</span> :: Initializing audio subsystem...`,
  `<span>OK</span>  :: System nominal. Welcome back.`,
];

/* ─── PAGINATION ─────────────────────────────────────────────────── */
const PAGINATION = {
  blogPageSize:    6,   // posts per page on /blog
  homeRecentPosts: 2,   // recent posts shown on home
};

/* ─── ABOUT PAGE CONTENT ────────────────────────────────────────── */
/* Edit your about page markdown here — HTML is also supported */
const ABOUT_CONTENT = `
## Hello World!

I'm Nomu — a systems engineer who finds beauty in the intersection of
low-level code and high-level thinking. I work on distributed systems,
compilers, and developer tooling by day. By night I experiment with generative
art, cryptography, and whatever rabbit hole I fell into that week.

## This Site

NOMU's is my yapping place. A space to think out loud, share what I learn,
and build useful tools. Everything here is hand-crafted — single HTML file,
no framework, no build step.

## Stack

Primarily **Rust**, **Go**, and **TypeScript**. I'm obsessed with performance
and correctness. Postgres over everything. Terminal over GUI.

## Contact

Best reached at [nomu@example.com](mailto:nomu@example.com) or on
[Instagram](https://instagram.com/akumanomu). I reply to interesting emails.
`;

/* ─── MUSIC LIBRARY ──────────────────────────────────────────────── */

const MUSIC_DB = [
  { id: 't1', title: 'No One Ever Said'   },
  { id: 't2', title: 'Rises The Moon'    },
  { id: 't3', title: 'Sorry, I Like You' },
  { id: 't4', title: 'Wet' },
  { id: 't5', title: "World's Number One Oden Store" },
];

/* ─── CONTENT DATABASE ───────────────────────────────────────────── */
/*
  If you use the file-based content loader (content/ folder + content.json manifest),
  DB.posts / DB.projects / DB.resources will be overwritten at boot.
  You can still add fallback inline entries here for demo / offline use.
*/
const DB = {
  site:      SITE_CONFIG,
  music:     MUSIC_DB,

  /* ---- POSTS -------------------------------------------------------- */
  posts: [],

  /* ---- PROJECTS ------------------------------------------------------ */
  projects: [],

  /* ---- TOOLS ---------------------------------------------------------- */
  tools: [
    { id: 'password', name: 'Password Generator', desc: 'Secure random passwords with customizable rules.',  icon: 'key',         tag: 'Security',   category: 'Security'   },
    { id: 'hash',     name: 'Hash Generator',      desc: 'SHA-256, SHA-512, MD5 hashing in the browser.',   icon: 'hash',        tag: 'Crypto',     category: 'Security'   },
    { id: 'base64',   name: 'Base64 Encoder',       desc: 'Encode/decode Base64 strings instantly.',         icon: 'code',        tag: 'Encoding',   category: 'Encoding'   },
    { id: 'uuid',     name: 'UUID Generator',       desc: 'Generate v4 UUIDs in bulk.',                      icon: 'fingerprint', tag: 'Utils',      category: 'Utilities'  },
    { id: 'color',    name: 'Color Converter',      desc: 'Convert between HEX, RGB, HSL color formats.',   icon: 'palette',     tag: 'Design',     category: 'Design'     },
    { id: 'json',     name: 'JSON Formatter',       desc: 'Pretty-print and validate JSON.',                 icon: 'braces',      tag: 'Utils',      category: 'Utilities'  },
  ],

  /* ---- RESOURCES ------------------------------------------------------ */
  resources: [],
};
