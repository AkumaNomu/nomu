/* ================================================================
   CONFIG.JS - Single source of truth for NOMU's site
================================================================ */

/* Set to true to load content from content/content.json + folders. */
const USE_CONTENT_MANIFEST = true;

/* --- SITE META -------------------------------------------------- */
const SITE_CONFIG = {
  name:       'NOMU\'s',
  tagline:    'Terminal · v3.0',
  author:     'Nomu',
  initials:   'N',
  logoSrc:    'assets/Nomu.svg',
  logoAlt:    'Nomu logo',
  bio:        'You can see me yap a lot or admire how amazing I am, whatever floats your boat.',
  email:      'nomu@example.com',
  avatar:     null,
  bootLabel:  'NOMU\'s',
  social: {
    github:    'https://github.com/AkumaNomu',
    instagram: 'https://instagram.com/akumanomu',
    discord:   null,
  },
};

/* --- NAV / HERO / DEFAULTS ------------------------------------- */
const NAV_LABEL = 'Navigation';
const NAV_ITEMS = [
  { id: 'home',      label: 'Home',      icon: 'home' },
  { id: 'blog',      label: 'Blog',      icon: 'blog',      badgeId: 'nb-blog' },
  { id: 'projects',  label: 'Projects',  icon: 'projects',  badgeId: 'nb-proj' },
  { id: 'resources', label: 'Resources', icon: 'resources' },
  { id: 'tools',     label: 'Tools',     icon: 'tools',     badgeId: 'nb-tools' },
  { id: 'about',     label: 'About',     icon: 'about' },
];

const HERO = {
  eyebrow:  'SYSTEM ONLINE · EST. 2026',
  headline: 'Hey, I\'m {author}.<br>I build and break things.',
  bio:      SITE_CONFIG.bio,
  actions: [
    { label: 'Read Blog', view: 'blog',     style: 'primary', icon: 'blog' },
    { label: 'Projects',  view: 'projects', style: 'ghost',   icon: 'projects' },
    { label: 'Tools',     view: 'tools',    style: 'outline', icon: 'tools' },
  ],
  phrases: [],
};

const FEATURE_FLAGS = {
  showMusic: true,
  showResources: true,
  showTools: true,
  showRightRail: true,
  showSearch: true,
  showQuickbar: true,
};

const DEFAULTS = {
  themeIdx: 0,
  sfxEnabled: true,
  defaultView: 'home',
  musicAutoplay: false,
};

const SEO = {
  description: SITE_CONFIG.bio,
  ogImage: SITE_CONFIG.logoSrc,
  siteUrl: '',
  twitterHandle: '',
};

const FORMAT = {
  dateLocale: 'en-US',
  dateOptions: { year: 'numeric', month: 'short', day: 'numeric' },
  readTimeWpm: 200,
};

/* --- CONTENT CATEGORIES ----------------------------------------- */
const PROJECT_CATEGORIES = ['All', 'Development', 'Video Editing'];
const PROJECT_FOCUS_MAP = {
  Development: ['All', 'AI', 'Web', 'Systems'],
  'Video Editing': ['All', 'Motion Design', 'Long-form content', 'Short-form content']
};

const RESOURCE_TYPES = ['All', 'Book', 'Guide', 'Tutorial', 'Site', 'App', 'Course'];

const DIFF_COLORS = {
  Beginner:     '#22c55e',
  Intermediate: '#f59e0b',
  Advanced:     '#ef4444',
  Various:      '#8b5cf6',
};

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

const SOUND_PRESETS = {
  click: [
    ['sine',     72,  0.72, 0.06, 0.12],
    ['triangle', 144, 0.68, 0.04, 0.10],
  ],
  toggle: [
    ['sine',     110, 1.08, 0.07, 0.18],
    ['triangle', 220, 1.04, 0.04, 0.16],
    ['sine',     330, 1.02, 0.02, 0.14],
  ],
  open: [
    ['sine',     82,  1.28, 0.07, 0.22],
    ['triangle', 164, 1.18, 0.04, 0.20],
    ['sine',     246, 1.12, 0.02, 0.18],
  ],
  close: [
    ['sine',     196, 0.62, 0.06, 0.18],
    ['triangle', 130, 0.68, 0.04, 0.16],
  ],
  success: [
    ['sine',     220, 1.35, 0.06, 0.20],
    ['sine',     330, 1.30, 0.04, 0.18],
    ['sine',     440, 1.25, 0.02, 0.16],
  ],
  error: [
    ['sawtooth', 110, 0.60, 0.05, 0.20],
    ['square',    82, 0.58, 0.03, 0.18],
  ],
  scan: [
    ['sine',     55,  1.40, 0.07, 0.28],
    ['triangle', 110, 1.30, 0.04, 0.24],
    ['sine',     165, 1.20, 0.02, 0.20],
  ],
};

const BOOT_MESSAGES = [
  '<span>SYS</span> :: Loading kernel modules...',
  '<span>NET</span> :: Establishing secure connection...',
  '<span>DB</span>  :: Parsing content manifest...',
  '<span>UI</span>  :: Rendering interface components...',
  '<span>SFX</span> :: Initializing audio subsystem...',
  '<span>OK</span>  :: System nominal. Welcome back.',
];

const PAGINATION = {
  blogPageSize:    6,
  homeRecentPosts: 2,
};

const ABOUT_CONTENT = `
## Hello World!

I'm Nomu - a systems engineer who finds beauty in the intersection of
low-level code and high-level thinking. I work on distributed systems,
compilers, and developer tooling by day. By night I experiment with generative
art, cryptography, and whatever rabbit hole I fell into that week.

## This Site

NOMU's is my yapping place. A space to think out loud, share what I learn,
and build useful tools. Everything here is hand-crafted - single HTML file,
no framework, no build step.

## Stack

Primarily **Rust**, **Go**, and **TypeScript**. I'm obsessed with performance
and correctness. Postgres over everything. Terminal over GUI.

## Contact

Best reached at [nomu@example.com](mailto:nomu@example.com) or on
[Instagram](https://instagram.com/akumanomu). I reply to interesting emails.
`;

/* --- MUSIC ------------------------------------------------------ */
const MUSIC_DB = [
  { id: 't1', title: 'No One Ever Said',              artist: 'Session Archive', duration: 214, cover: null, src: null },
  { id: 't2', title: 'Rises The Moon',                artist: 'Session Archive', duration: 187, cover: null, src: null },
  { id: 't3', title: 'Sorry, I Like You',             artist: 'Session Archive', duration: 259, cover: null, src: null },
  { id: 't4', title: 'Wet',                           artist: 'Session Archive', duration: 213, cover: null, src: null },
  { id: 't5', title: "World's Number One Oden Store", artist: 'Session Archive', duration: 252, cover: null, src: null },
];

/* --- CONTENT DB ------------------------------------------------- */
const DB = {
  site:      SITE_CONFIG,
  music:     MUSIC_DB,
  posts:     [],
  projects:  [],
  resources: [],
  tools: [
    // Populated dynamically by js/tools.js from the tools registry.
  ],
};
