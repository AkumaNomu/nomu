/* ================================================================
   UTILS.JS — Core utilities, routing, state, boot, rendering
================================================================ */

/* ─── Ambient canvas ─────────────────────────────────────── */
(function () {
  const c = document.getElementById('bg-canvas');
  const ctx = c.getContext('2d');
  let W, H, particles = [];

  function resize() { W = c.width = window.innerWidth; H = c.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  function accentHue() {
    return getComputedStyle(document.documentElement).getPropertyValue('--ah').trim() || '175';
  }
  function accentColor(alpha) {
    return `hsla(${accentHue()},100%,55%,${alpha})`;
  }

  function drawGrid() {
    const s = 60;
    ctx.strokeStyle = accentColor(0.03);
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += s) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  class P {
    constructor() { this.reset(true); }
    reset(init) {
      this.x = Math.random() * W;
      this.y = init ? Math.random() * H : H + 10;
      this.r = Math.random() * 1.5 + 0.3;
      this.vy = -(Math.random() * 0.4 + 0.1);
      this.vx = (Math.random() - 0.5) * 0.2;
      this.alpha = Math.random() * 0.5 + 0.1;
    }
    update() { this.x += this.vx; this.y += this.vy; if (this.y < -10) this.reset(); }
    draw() {
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = accentColor(this.alpha); ctx.fill();
    }
  }

  for (let i = 0; i < 80; i++) particles.push(new P());

  function loop() {
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }
  loop();
})();

/* ─── State ──────────────────────────────────────────────── */
let CUR_VIEW = 'home', CUR_POST = null;
let BLOG_FILTER = 'all', BLOG_PAGE = 1, BLOG_PAGE_SIZE = 6;
let CUR_PROJECT = null, CUR_RESOURCE = null;
let PROJ_CAT_FILTER = 'All', PROJ_FOCUS_FILTER = 'All';
let RES_TYPE_FILTER = 'All';
let PLAYER_OPEN = true, TRACK_IDX = 0, IS_PLAYING = false;
let AUDIO = null, FAKE_TIMER = null, FAKE_ELAPSED = 0;
let REACTIONS  = JSON.parse(localStorage.getItem('v2_reactions') || '{}');
let COMMENTS   = JSON.parse(localStorage.getItem('v2_comments') || '{}');
let CUR_TOOL = null, TOOL_CATEGORY_FILTER = 'All', TOOL_QUERY = '';
let SFX_ENABLED = JSON.parse(localStorage.getItem('sfx_enabled') || 'true');
let READING_MODE = JSON.parse(localStorage.getItem('reading_mode') || 'false');
const ARTICLE_SWIPE = { active: false, startX: 0, startY: 0, time: 0 };
const PULL_REFRESH = { tracking: false, active: false, refreshing: false, startY: 0, distance: 0 };

function isMobileViewport() {
  return window.matchMedia('(max-width: 860px)').matches;
}

function isReadingModeActive() {
  return !!READING_MODE && CUR_VIEW === 'article';
}

function updateReadingModeUI() {
  const btn = document.getElementById('reading-mode-toggle');
  if (!btn) return;
  const active = isReadingModeActive();
  const labelText = active ? 'Exit reading mode' : 'Reading mode';
  btn.classList.toggle('active', active);
  btn.setAttribute('aria-label', labelText);
  btn.setAttribute('title', labelText);
  const label = btn.querySelector('span');
  if (label) label.textContent = active ? 'Exit Reading Mode' : 'Reading Mode';
}

function syncReadingModeClass() {
  document.body.classList.toggle('reading-mode', isReadingModeActive());
  updateReadingModeUI();
}

function setReadingMode(enabled, notify = true) {
  READING_MODE = !!enabled;
  localStorage.setItem('reading_mode', JSON.stringify(READING_MODE));
  syncReadingModeClass();
  if (READING_MODE && typeof resetPullIndicator === 'function') resetPullIndicator();
  if (notify) toast(`Reading mode ${READING_MODE ? 'on' : 'off'}`);
}

function toggleReadingMode() {
  if (CUR_VIEW !== 'article') return;
  runReadingModeTransition(() => setReadingMode(!READING_MODE, true));
}

function runReadingModeTransition(action) {
  const main = document.getElementById('main');
  if (!main || main.classList.contains('is-mode-fading')) {
    action();
    return;
  }
  main.classList.add('is-mode-fading');
  setTimeout(() => {
    action();
    requestAnimationFrame(() => main.classList.remove('is-mode-fading'));
  }, 220);
}

/* ─── View transitions ------------------------------------------------ */
const VIEW_FADE_MS = 240;
function runViewTransition(action) {
  const main = document.getElementById('main');
  if (!main || main.classList.contains('is-fading')) {
    action();
    return;
  }
  main.classList.add('is-fading');
  setTimeout(() => {
    action();
    requestAnimationFrame(() => main.classList.remove('is-fading'));
  }, VIEW_FADE_MS);
}


/* ─── Router ─────────────────────────────────────────────── */
function nav(view, id, skipDelay = false) {
  const prevView = CUR_VIEW;
  if (typeof closeActionsModal === 'function') closeActionsModal();
  if (view !== 'article') {
    history.replaceState(null, '', location.href.split('#')[0]);
  }
  const prevTargetId = (CUR_VIEW === 'article')
    ? CUR_POST
    : (CUR_VIEW === 'project')
      ? CUR_PROJECT
      : (CUR_VIEW === 'resource')
        ? CUR_RESOURCE
        : null;
  const nextTargetId = id || null;
  const isDetailView = view === 'article' || view === 'project' || view === 'resource';
  const sameTarget = view === CUR_VIEW && (!isDetailView || nextTargetId === prevTargetId);
  const skipLoadingViews = view === 'home' || view === 'about' || view === 'resources' || view === 'blog' || view === 'projects';
  if (!sameTarget && !skipDelay) {
    if (!skipLoadingViews) {
      const navDelay = 800;
      const label = getLoadingLabel(view, id);
      flashPageLoading(label, navDelay);
      clearTimeout(NAV_LOADING_TIMER);
      NAV_LOADING_TIMER = setTimeout(() => nav(view, id, true), navDelay);
      return;
    }
  }
  const activeView = { article: 'blog', project: 'projects', resource: 'resources' }[view] || view;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.v === activeView));

  CUR_VIEW     = view;
  CUR_POST     = view === 'article'  ? (id || null) : null;
  CUR_PROJECT  = view === 'project'  ? (id || null) : null;
  CUR_RESOURCE = view === 'resource' ? (id || null) : null;
  syncMobileToolsBtn();

  const el = document.getElementById('v-' + view);
  if (el) el.classList.add('active');
  const shell = document.getElementById('shell');
  if (shell) shell.classList.toggle('tools-rail-open', view === 'tools');
  if (view !== 'tools' && typeof window.closeToolsRail === 'function') window.closeToolsRail();

  syncReadingModeClass();
  updateQuickbar();
  if (prevView !== view || id) document.getElementById('main').scrollTop = 0;
  if (typeof playSfx === 'function' && prevView !== view) playSfx('open');

  if (view === 'article' && id) {
    loadArticle(id);
    history.replaceState(null, '', `${location.href.split('#')[0]}#${id}`);
  }
  if (view === 'project'  && id) loadProjectDetail(id);
  if (view === 'resource' && id) loadResourceDetail(id);
  closeMob();
}

/* ─── Helpers ────────────────────────────────────────────── */
function fmtDate(s) {
  const locale = (typeof FORMAT !== 'undefined' && FORMAT.dateLocale) ? FORMAT.dateLocale : 'en-US';
  const options = (typeof FORMAT !== 'undefined' && FORMAT.dateOptions)
    ? FORMAT.dateOptions
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(s).toLocaleDateString(locale, options);
}
function fmtDur(s) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
function getAllTags() {
  const t = new Set();
  DB.posts.forEach(p => (p.tags || []).forEach(g => t.add(g)));
  return [...t].sort();
}
function openUrl(url) {
  if (url) window.open(url, '_blank');
  else toast('No link available');
}

function slugifyName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function splitList(value) {
  if (!value) return [];
  return String(value)
    .split('|')
    .join(',')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function parseGallery(value) {
  if (!value) return [];
  return String(value).split('|').map(s => s.trim()).filter(Boolean).map(entry => {
    const parts = entry.split('::');
    return { src: (parts[0] || '').trim(), caption: (parts[1] || '').trim() };
  }).filter(g => g.src);
}

function parseQuickLinks(value) {
  if (!value) return [];
  return String(value).split('|').map(s => s.trim()).filter(Boolean).map(entry => {
    const parts = entry.split('::');
    return { label: (parts[0] || '').trim(), url: (parts[1] || '').trim() };
  }).filter(l => l.label && l.url);
}

function parseFrontmatter(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  if (!lines.length || lines[0].trim() !== '---') return { meta: {}, body: markdown };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { end = i; break; }
  }
  if (end === -1) return { meta: {}, body: markdown };

  const meta = {};
  for (const line of lines.slice(1, end)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) meta[key] = value;
  }
  return { meta, body: lines.slice(end + 1).join('\n') };
}

function estimateReadTime(markdown) {
  const words = String(markdown || '').trim().split(/\s+/).filter(Boolean).length;
  const wpm = (typeof FORMAT !== 'undefined' && FORMAT.readTimeWpm) ? FORMAT.readTimeWpm : 200;
  return Math.max(1, Math.round(words / wpm));
}

async function fetchFirstOk(urls) {
  for (const url of urls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return resp;
    } catch (e) {
      continue;
    }
  }
  return null;
}

function getResourceDirs() {
  const base = Array.isArray(RESOURCE_TYPES)
    ? RESOURCE_TYPES.filter(t => t && t !== 'All')
    : ['Guide', 'Tutorial', 'Book', 'Site', 'App', 'Course'];
  const dirs = new Set();
  base.forEach(t => {
    dirs.add(t);
    dirs.add(`${t}s`);
  });
  dirs.add('Guides');
  return [...dirs];
}

function applySiteMeta() {
  if (typeof DB === 'undefined' || !DB.site) return;

  const site = DB.site || {};
  const name = site.name || 'Site';
  const tagline = site.tagline || '';

  document.title = name;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) el.textContent = value;
  };

  setText('site-name', name);
  setText('logo-text', name);
  setText('logo-tagline', tagline);
  if (site.logoSrc) {
    const mark = document.getElementById('logo-mark');
    if (mark) { mark.src = site.logoSrc; mark.alt = site.logoAlt || name; }
    const glyph = document.getElementById('logo-glyph-img');
    if (glyph) { glyph.src = site.logoSrc; glyph.alt = site.logoAlt || name; }
  }
  const mobEl = document.getElementById('mob-title');
  if (mobEl) {
    const mobTitle = site.bootLabel || name;
    const dotIndex = mobTitle.indexOf('.');
    if (dotIndex !== -1) {
      mobEl.textContent = '';
      const before = document.createTextNode(mobTitle.slice(0, dotIndex));
      const dot = document.createElement('span');
      dot.textContent = '.';
      const after = document.createTextNode(mobTitle.slice(dotIndex + 1));
      mobEl.append(before, dot, after);
    } else {
      mobEl.textContent = mobTitle;
    }
  }

  const githubLink = site.social && site.social.github ? site.social.github : '';
  const githubEl = document.getElementById('github-link');
  if (githubEl && githubLink) githubEl.setAttribute('href', githubLink);
}

const NAV_ICON_MAP = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  blog: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  projects: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  resources: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  tools: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  about: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

function renderNav() {
  const items = (typeof NAV_ITEMS !== 'undefined' && NAV_ITEMS.length)
    ? NAV_ITEMS
    : [
        { id: 'home', label: 'Home', icon: 'home' },
        { id: 'blog', label: 'Blog', icon: 'blog', badgeId: 'nb-blog' },
        { id: 'projects', label: 'Projects', icon: 'projects', badgeId: 'nb-proj' },
        { id: 'resources', label: 'Resources', icon: 'resources' },
        { id: 'tools', label: 'Tools', icon: 'tools', badgeId: 'nb-tools' },
        { id: 'about', label: 'About', icon: 'about' },
      ];
  const flags = (typeof FEATURE_FLAGS !== 'undefined') ? FEATURE_FLAGS : {};
  const mount = document.getElementById('nav-items');
  if (!mount) return;

  const labelEl = document.getElementById('nav-label');
  if (labelEl && typeof NAV_LABEL !== 'undefined') labelEl.textContent = NAV_LABEL;

  const filtered = items.filter(item => {
    if (item.id === 'resources' && flags.showResources === false) return false;
    if (item.id === 'tools' && flags.showTools === false) return false;
    return true;
  });

  mount.innerHTML = filtered.map(item => `
    <button class="nav-btn" data-v="${item.id}" onclick="nav('${item.id}')">
      ${(NAV_ICON_MAP[item.icon] || NAV_ICON_MAP[item.id]) || ''}
      ${item.label}
      ${item.badgeId ? `<span class="nav-badge" id="${item.badgeId}">0</span>` : ''}
    </button>
  `).join('');
}

function applyHeroConfig() {
  if (typeof HERO === 'undefined') return;
  const hero = HERO || {};
  const site = (typeof DB !== 'undefined' && DB.site) ? DB.site : {};
  const author = site.author || site.name || 'Author';

  const eyebrowEl = document.getElementById('hero-eyebrow');
  if (eyebrowEl && hero.eyebrow) eyebrowEl.textContent = hero.eyebrow;

  const titleEl = document.getElementById('hero-title');
  if (titleEl && hero.headline) {
    const html = hero.headline.replace('{author}', `<span class="hl" id="hero-name">${author}</span>`);
    titleEl.innerHTML = html;
  } else {
    const nameEl = document.getElementById('hero-name');
    if (nameEl) nameEl.textContent = author;
  }

  const bioEl = document.getElementById('hero-bio');
  if (bioEl && hero.bio) bioEl.textContent = hero.bio;

  const actionsEl = document.getElementById('hero-actions');
  if (actionsEl && Array.isArray(hero.actions)) {
    actionsEl.innerHTML = hero.actions.map(action => {
      const style = action.style ? `btn-${action.style}` : 'btn-primary';
      const icon = (NAV_ICON_MAP[action.icon] || '') || '';
      const handler = action.view
        ? `nav('${action.view}')`
        : action.url
          ? `openUrl('${action.url}')`
          : '';
      return `<button class="btn ${style}" onclick="${handler}">${icon}${action.label}</button>`;
    }).join('');
  }
}

function applyFeatureFlags() {
  const flags = (typeof FEATURE_FLAGS !== 'undefined') ? FEATURE_FLAGS : {};
  const toggle = (id, show) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = show ? '' : 'none';
  };

  toggle('right-rail', flags.showRightRail !== false);
  toggle('player', flags.showMusic !== false);
  toggle('v-resources', flags.showResources !== false);
  toggle('v-tools', flags.showTools !== false);
  toggle('search-modal', flags.showSearch !== false);
  toggle('search-pill', flags.showSearch !== false);
  toggle('mob-search-btn', flags.showSearch !== false);
  toggle('quickbar', flags.showQuickbar !== false);
}

function applySeoMeta() {
  if (typeof SEO === 'undefined') return;
  const seo = SEO || {};
  const site = (typeof DB !== 'undefined' && DB.site) ? DB.site : {};

  const upsertMeta = (attr, name, content) => {
    if (!content) return;
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  upsertMeta('name', 'description', seo.description || site.bio || '');
  upsertMeta('property', 'og:title', site.name || '');
  upsertMeta('property', 'og:description', seo.description || site.bio || '');
  upsertMeta('property', 'og:image', seo.ogImage || '');
  upsertMeta('property', 'og:url', seo.siteUrl || '');
  upsertMeta('name', 'twitter:card', seo.ogImage ? 'summary_large_image' : 'summary');
  upsertMeta('name', 'twitter:title', site.name || '');
  upsertMeta('name', 'twitter:description', seo.description || site.bio || '');
  upsertMeta('name', 'twitter:image', seo.ogImage || '');
  if (seo.twitterHandle) upsertMeta('name', 'twitter:site', seo.twitterHandle);
}

function applyDefaults() {
  if (typeof DEFAULTS === 'undefined') return;
  const defaults = DEFAULTS || {};
  if (defaults.themeIdx !== undefined && localStorage.getItem('themeIdx') === null) {
    localStorage.setItem('themeIdx', String(defaults.themeIdx));
  }
  if (defaults.sfxEnabled !== undefined && localStorage.getItem('sfx_enabled') === null) {
    localStorage.setItem('sfx_enabled', JSON.stringify(!!defaults.sfxEnabled));
  }
}

/* ─── Icon registries (loaded from config.js) ────────────── */
const PROJ_ICONS = {
  terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  palette:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  database: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  git:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>`,
  motion:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12c3-6 6 6 9 0s6 6 9 0"/></svg>`,
  video:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="4" x2="7" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/></svg>`,
};

const TOOL_ICONS = {
  key:         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  hash:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`,
  code:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  fingerprint: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2"/></svg>`,
  palette:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  braces:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/></svg>`,
  spark:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.2 5.2L20 9l-5.2 2.2L12 16l-2.8-4.8L4 9l5.8-1.8L12 2z"/></svg>`,
  text:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16"/><path d="M9 7v10"/><path d="M15 7v10"/></svg>`,
  calc:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="10" y2="11"/><line x1="14" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="10" y2="15"/><line x1="14" y1="15" x2="16" y2="15"/></svg>`,
  clock:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  shield:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z"/></svg>`,
  database:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v10c0 1.66 3.6 3 8 3s8-1.34 8-3V5"/></svg>`,
  chip:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M7 1v4M17 1v4M7 19v4M17 19v4M1 7h4M1 17h4M19 7h4M19 17h4"/></svg>`,
  image:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="2"/><path d="M21 16l-5-5-4 4-2-2-5 5"/></svg>`,
};

const PROJECT_CATEGORY_ICON_MAP = (typeof PROJECT_CATEGORY_ICONS !== 'undefined')
  ? PROJECT_CATEGORY_ICONS
  : {
      Development: PROJ_ICONS.terminal,
      'Motion Design': PROJ_ICONS.motion,
      'Video Editing': PROJ_ICONS.video,
    };

const TOOL_CATEGORY_ICON_MAP = (typeof TOOL_CATEGORY_ICONS !== 'undefined')
  ? TOOL_CATEGORY_ICONS
  : {
      Converters: TOOL_ICONS.braces,
      Generators: TOOL_ICONS.spark,
      'Text Tools': TOOL_ICONS.text,
      'Developer Tools': TOOL_ICONS.code,
      'Image Tools': TOOL_ICONS.image,
      Calculators: TOOL_ICONS.calc,
      'Productivity & Organizers': TOOL_ICONS.clock,
      'Security & Crypto': TOOL_ICONS.shield,
      'Data & Files': TOOL_ICONS.database,
      'AI Tools': TOOL_ICONS.chip,
    };

window.PROJECT_CATEGORY_ICON_MAP = PROJECT_CATEGORY_ICON_MAP;
window.TOOL_CATEGORY_ICON_MAP = TOOL_CATEGORY_ICON_MAP;
window.TOOL_ICONS = TOOL_ICONS;

const RES_ICONS = {
  Book:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  Guide:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  Tutorial: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
  App:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  Site:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  Course:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
};

/* ─── Content rendering ──────────────────────────────────── */
/*  Parse markdown → sanitise → inject code highlighting + KaTeX */
let MARKED_CONFIGURED = false;

function normalizeLinkKey(value) {
  return slugifyName(String(value || '').trim());
}

function resolveWikilinkTarget(value) {
  if (typeof DB === 'undefined') return null;
  const key = normalizeLinkKey(value);
  const findMatch = (items, getLabel, type) => {
    const match = items.find(item =>
      normalizeLinkKey(item.id) === key || normalizeLinkKey(getLabel(item)) === key
    );
    return match ? { type, id: match.id } : null;
  };
  const post = findMatch(DB.posts || [], p => p.title, 'article');
  if (post) return post;
  const project = findMatch(DB.projects || [], p => p.name, 'project');
  if (project) return project;
  const resource = findMatch(DB.resources || [], r => r.title, 'resource');
  if (resource) return resource;
  return null;
}

function escapeHtmlBasic(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function transformOutsideCodeBlocks(markdown, transform) {
  const parts = String(markdown || '').split(/```/);
  return parts.map((part, idx) => (idx % 2 === 0 ? transform(part) : part)).join('```');
}

function buildWikilinkMarkup(target, alias, blockId) {
  const resolved = resolveWikilinkTarget(target);
  const safeAlias = escapeHtmlBasic(alias);
  if (!resolved) return `<span class="wikilink broken">${safeAlias}</span>`;
  const attrs = [
    `data-wl-type="${resolved.type}"`,
    `data-wl-id="${resolved.id}"`,
    blockId ? `data-wl-block="${blockId}"` : '',
  ].filter(Boolean).join(' ');
  return `<a href="#" class="wikilink" ${attrs}>${safeAlias}</a>`;
}

function preprocessObsidianMarkdown(markdown) {
  return transformOutsideCodeBlocks(markdown, segment => {
    let out = segment;
    out = out.replace(/\[\[([^\]]+)\]\]/g, (match, inner) => {
      const parts = inner.split('|');
      const rawTarget = (parts[0] || '').trim();
      const alias = (parts[1] || parts[0] || '').trim();
      let page = rawTarget;
      let blockId = '';
      if (rawTarget.includes('#^')) {
        const split = rawTarget.split('#^');
        page = (split[0] || '').trim();
        blockId = (split[1] || '').trim();
      } else if (rawTarget.includes('#')) {
        const split = rawTarget.split('#');
        page = (split[0] || '').trim();
        blockId = (split[1] || '').trim();
      }
      if (!page) return escapeHtmlBasic(alias || rawTarget);
      return buildWikilinkMarkup(page, alias || page, blockId);
    });
    out = out.replace(/==([\s\S]*?)==/g, (match, inner) => {
      if (!inner || /\n/.test(inner)) return match;
      return `<mark>${escapeHtmlBasic(inner)}</mark>`;
    });
    return out;
  });
}

function sanitizeFootnoteId(value) {
  return String(value || '').trim().replace(/[^A-Za-z0-9_-]/g, '') || 'fn';
}

function extractFootnotes(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const notes = {};
  const out = [];
  let currentId = null;
  lines.forEach(line => {
    const def = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
    if (def) {
      const rawId = def[1];
      const safeId = sanitizeFootnoteId(rawId);
      notes[safeId] = notes[safeId] || { label: rawId, content: '' };
      notes[safeId].content = def[2] || '';
      currentId = safeId;
      return;
    }
    if (currentId && /^\s{2,}\S/.test(line)) {
      notes[currentId].content += `\n${line.trim()}`;
      return;
    }
    currentId = null;
    out.push(line);
  });
  return { markdown: out.join('\n'), notes };
}

function injectFootnoteRefs(markdown, notes) {
  if (!notes || !Object.keys(notes).length) return markdown;
  return markdown.replace(/\[\^([^\]]+)\]/g, (match, rawId) => {
    const safeId = sanitizeFootnoteId(rawId);
    if (!notes[safeId]) return match;
    return `<sup class="footnote-ref"><a href="#fn-${safeId}" id="fnref-${safeId}">${escapeHtmlBasic(rawId)}</a></sup>`;
  });
}

function buildFootnotesHtml(notes) {
  const entries = Object.entries(notes || {});
  if (!entries.length) return '';
  const items = entries.map(([id, note]) => {
    const content = note?.content || '';
    const html = (typeof marked !== 'undefined' && typeof marked.parseInline === 'function')
      ? marked.parseInline(content)
      : escapeHtmlBasic(content);
    return `<li id="fn-${id}">${html} <a href="#fnref-${id}" class="footnote-backref">↩</a></li>`;
  }).join('');
  return `<section class="footnotes"><ol>${items}</ol></section>`;
}

function bindWikilinks(targetEl) {
  if (!targetEl || targetEl.dataset.wikilinkBound === '1') return;
  targetEl.dataset.wikilinkBound = '1';
  targetEl.addEventListener('click', e => {
    const link = e.target.closest('a.wikilink[data-wl-type]');
    if (!link) return;
    e.preventDefault();
    const type = link.dataset.wlType;
    const id = link.dataset.wlId;
    const blockId = link.dataset.wlBlock;
    if (!type || !id) return;
    if (type === 'article') nav('article', id);
    else if (type === 'project') nav('project', id);
    else if (type === 'resource') nav('resource', id);
    if (blockId) {
      setTimeout(() => {
        document.getElementById(blockId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 350);
    }
  });
}

function applyCallouts(targetEl) {
  const blocks = [...targetEl.querySelectorAll('blockquote')];
  blocks.forEach(block => {
    const first = block.querySelector('p');
    if (!first) return;
    const raw = (first.textContent || '').trim();
    const match = raw.match(/^\[!([a-zA-Z]+)\]\s*(.*)$/);
    if (!match) return;
    const typeRaw = match[1].toLowerCase();
    const type = ['note', 'tip', 'info', 'warning', 'danger'].includes(typeRaw) ? typeRaw : 'note';
    const titleText = match[2] ? match[2].trim() : type;
    first.textContent = first.textContent.replace(/^\[![^\]]+\]\s*/, '');
    if (!first.textContent.trim()) first.remove();
    const callout = document.createElement('div');
    callout.className = `callout callout-${type}`;
    const title = document.createElement('div');
    title.className = 'callout-title';
    title.textContent = titleText || type;
    const body = document.createElement('div');
    body.className = 'callout-body';
    while (block.firstChild) body.appendChild(block.firstChild);
    callout.append(title, body);
    block.replaceWith(callout);
  });
}

function applyBlockRefs(targetEl) {
  targetEl.querySelectorAll('p, li').forEach(el => {
    const text = el.textContent || '';
    const match = text.match(/\s\^([A-Za-z0-9_-]+)$/);
    if (!match) return;
    const blockId = match[1];
    const last = el.lastChild;
    if (last && last.nodeType === 3) {
      last.textContent = last.textContent.replace(/\s\^[A-Za-z0-9_-]+$/, '');
    } else {
      el.innerHTML = el.innerHTML.replace(/\s\^[A-Za-z0-9_-]+$/, '');
    }
    el.id = blockId;
  });
}

function renderMarkdown(markdown, targetEl) {
  if (typeof marked === 'undefined' || !targetEl) return;
  if (!MARKED_CONFIGURED) {
    marked.setOptions({ gfm: true, breaks: false });
    MARKED_CONFIGURED = true;
  }

  // Render markdown
  const { markdown: stripped, notes } = extractFootnotes(markdown || '');
  const pre  = preprocessObsidianMarkdown(stripped);
  const withRefs = injectFootnoteRefs(pre, notes);
  const raw  = marked.parse(withRefs);
  const safe = (typeof DOMPurify !== 'undefined')
    ? DOMPurify.sanitize(raw, { ADD_ATTR: ['data-wl-type', 'data-wl-id', 'data-wl-block'], ADD_TAGS: ['mark'] })
    : raw;
  targetEl.innerHTML = safe;

  // Code syntax highlighting via Prism
  if (typeof Prism !== 'undefined') {
    targetEl.querySelectorAll('pre code').forEach(block => {
      // Wrap in styled container
      const pre = block.parentElement;
      if (pre && pre.tagName === 'PRE' && !pre.parentElement?.classList.contains('code-block-wrapped')) {
        const wrap = document.createElement('div');
        wrap.className = 'code-block-wrapped';
        const lang = [...block.classList].find(c => c.startsWith('language-'))?.replace('language-', '') || '';
        const header = document.createElement('div');
        header.className = 'code-header';
        header.innerHTML = `
          <span class="code-lang">${lang || 'code'}</span>
          <button class="code-copy-btn" onclick="copyCodeBlock(this)" title="Copy code">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>`;
        pre.parentNode.insertBefore(wrap, pre);
        wrap.appendChild(header);
        wrap.appendChild(pre);
        Prism.highlightElement(block);
      }
    });
  }

  bindWikilinks(targetEl);
  applyCallouts(targetEl);
  applyBlockRefs(targetEl);

  if (notes && Object.keys(notes).length) {
    const footHtml = buildFootnotesHtml(notes);
    if (footHtml) {
      const safeFoot = (typeof DOMPurify !== 'undefined')
        ? DOMPurify.sanitize(footHtml, { ADD_ATTR: ['id', 'href', 'class'], ADD_TAGS: ['section', 'ol', 'li', 'a', 'sup'] })
        : footHtml;
      targetEl.insertAdjacentHTML('beforeend', safeFoot);
    }
  }

  // KaTeX math rendering
  if (typeof katex !== 'undefined' && typeof renderMathInElement !== 'undefined') {
    renderMathInElement(targetEl, {
      delimiters: [
        { left: '$$', right: '$$', display: true  },
        { left: '$',  right: '$',  display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
    });
  }
}

function copyCodeBlock(btn) {
  const code = btn.closest('pre')?.querySelector('code');
  if (!code) return;
  navigator.clipboard.writeText(code.textContent || '').then(() => {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
      btn.classList.remove('copied');
    }, 2000);
  });
}

/* ─── Loading skeletons ──────────────────────────────────── */
function skeletonCard(lines = 3) {
  return `<div class="skeleton-card">
    <div class="skeleton-cover"></div>
    <div class="skeleton-body">
      ${Array.from({ length: lines }, (_, i) =>
        `<div class="skeleton-line" style="width:${i === 0 ? 70 : i === lines - 1 ? 45 : 90}%"></div>`
      ).join('')}
    </div>
  </div>`;
}

function showSectionLoader(mountId, count = 4) {
  const el = document.getElementById(mountId);
  if (el) el.innerHTML = Array(count).fill(skeletonCard()).join('');
}

/* ─── TOC ────────────────────────────────────────────────── */
let TOC_OBSERVER = null;

function buildTOC() {
  const hdrs = [...document.querySelectorAll('#art-body h1,#art-body h2,#art-body h3')];
  const tc = document.getElementById('toc-container');
  if (!tc) return;
  if (TOC_OBSERVER) { TOC_OBSERVER.disconnect(); TOC_OBSERVER = null; }
  if (!hdrs.length) {
    tc.innerHTML = `<div class="toc-empty">No headings</div>`;
    return;
  }
  tc.innerHTML = hdrs.map(h =>
    `<div class="toc-item" data-level="${h.tagName[1]}" data-target="${h.id}" onclick="scrollToH('${h.id}')">${h.textContent}</div>`
  ).join('');

  TOC_OBSERVER = new IntersectionObserver(entries => {
    let best = null;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const top = Math.abs(entry.boundingClientRect.top);
        if (!best || top < best.top) best = { id: entry.target.id, top };
      }
    });
    if (!best) return;
    document.querySelectorAll('.toc-item').forEach(t => {
      t.classList.toggle('active', t.dataset.target === best.id);
    });
  }, { root: document.getElementById('main'), rootMargin: '-80px 0px -70% 0px', threshold: [0, 1] });

  hdrs.forEach(h => TOC_OBSERVER.observe(h));
}

function scrollToH(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Right rail ─────────────────────────────────────────── */
function renderRightRail() {
  const tags  = getAllTags();
  const words = DB.posts.reduce((s, p) => s + (p.markdown || '').split(/\s+/).length, 0);
  document.getElementById('rr-stats').innerHTML = `
    <div class="stat-card"><div class="stat-val">${DB.posts.length}</div><div class="stat-label">Posts</div></div>
    <div class="stat-card"><div class="stat-val">${DB.projects.length}</div><div class="stat-label">Projects</div></div>
    <div class="stat-card"><div class="stat-val">${tags.length}</div><div class="stat-label">Tags</div></div>
    <div class="stat-card"><div class="stat-val">${Math.round(words / 1000)}k</div><div class="stat-label">Words</div></div>`;
  document.getElementById('nb-blog').textContent  = DB.posts.length;
  document.getElementById('nb-proj').textContent  = DB.projects.length;
  document.getElementById('nb-tools').textContent = DB.tools.length;
}

/* ─── Lightbox ───────────────────────────────────────────── */
const VIEWER = { kind: 'image', scale: 1, x: 0, y: 0, isPanning: false, startX: 0, startY: 0 };

function openViewerImage(src) {
  const modal = document.getElementById('lightbox');
  const img   = document.getElementById('lb-img');
  const video = document.getElementById('lb-video');
  VIEWER.kind = 'image'; VIEWER.scale = 1; VIEWER.x = 0; VIEWER.y = 0;
  img.src = src; img.style.display = 'block';
  video.pause(); video.removeAttribute('src'); video.style.display = 'none';
  updateViewerTransform();
  modal.classList.add('open');
}
function openViewerVideo(src) {
  const modal = document.getElementById('lightbox');
  const img   = document.getElementById('lb-img');
  const video = document.getElementById('lb-video');
  VIEWER.kind = 'video';
  img.style.display = 'none'; video.style.display = 'block';
  video.src = src; video.load();
  modal.classList.add('open');
}
function openLb(src) { openViewerImage(src); }
function closeViewer() {
  document.getElementById('lightbox').classList.remove('open');
  document.getElementById('lb-video').pause();
  VIEWER.scale = 1; VIEWER.x = 0; VIEWER.y = 0; VIEWER.isPanning = false;
  updateViewerTransform();
}
function closeLb() { closeViewer(); }
function updateViewerTransform() {
  document.getElementById('lb-img').style.transform =
    `translate(${VIEWER.x}px, ${VIEWER.y}px) scale(${VIEWER.scale})`;
}
function zoomViewerIn()  { if (VIEWER.kind !== 'image') return; VIEWER.scale = Math.min(6, VIEWER.scale + 0.25); updateViewerTransform(); }
function zoomViewerOut() { if (VIEWER.kind !== 'image') return; VIEWER.scale = Math.max(1, VIEWER.scale - 0.25); if (VIEWER.scale === 1) { VIEWER.x = 0; VIEWER.y = 0; } updateViewerTransform(); }
function resetViewerImage() { if (VIEWER.kind !== 'image') return; VIEWER.scale = 1; VIEWER.x = 0; VIEWER.y = 0; updateViewerTransform(); }

function bindInlineMedia(root) {
  if (!root) return;
  root.querySelectorAll('img').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', e => { e.preventDefault(); openViewerImage(img.currentSrc || img.src); });
  });
  root.querySelectorAll('video').forEach(video => {
    video.addEventListener('click', e => { e.preventDefault(); openViewerVideo(video.currentSrc || video.src); });
  });
}

const viewerStage = document.getElementById('viewer-stage');
viewerStage.addEventListener('wheel', e => {
  if (VIEWER.kind !== 'image') return;
  e.preventDefault();
  e.deltaY < 0 ? zoomViewerIn() : zoomViewerOut();
}, { passive: false });
viewerStage.addEventListener('mousedown', e => {
  if (VIEWER.kind !== 'image' || VIEWER.scale <= 1) return;
  VIEWER.isPanning = true; VIEWER.startX = e.clientX - VIEWER.x; VIEWER.startY = e.clientY - VIEWER.y;
  viewerStage.classList.add('panning');
});
window.addEventListener('mousemove', e => {
  if (!VIEWER.isPanning) return;
  VIEWER.x = e.clientX - VIEWER.startX; VIEWER.y = e.clientY - VIEWER.startY;
  updateViewerTransform();
});
window.addEventListener('mouseup', () => { VIEWER.isPanning = false; viewerStage.classList.remove('panning'); });
document.getElementById('lb-img').addEventListener('dblclick', () => {
  if (VIEWER.kind !== 'image') return;
  if (VIEWER.scale > 1) resetViewerImage(); else { VIEWER.scale = 2; updateViewerTransform(); }
});
document.addEventListener('keydown', e => {
  if (!document.getElementById('lightbox').classList.contains('open')) return;
  if (e.key === 'Escape') { closeViewer(); return; }
  if (e.key === '+' || e.key === '=') zoomViewerIn();
  if (e.key === '-') zoomViewerOut();
  if (e.key === '0') resetViewerImage();
});

document.addEventListener('keydown', e => {
  if ((e.key || '').toLowerCase() !== 'r') return;
  if (e.repeat) return;
  if (CUR_VIEW !== 'article') return;
  if (document.getElementById('search-modal')?.classList.contains('open')) return;
  if (document.getElementById('lightbox')?.classList.contains('open')) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  e.preventDefault();
  toggleReadingMode();
});

/* ─── Scroll progress ─────────────────────────────────────── */
document.getElementById('main').addEventListener('scroll', function () {
  const { scrollTop, scrollHeight, clientHeight } = this;
  document.getElementById('scroll-bar').style.width = (scrollTop / (scrollHeight - clientHeight) * 100) + '%';
}, { passive: true });

function initArticleSwipeNavigation() {
  const articleView = document.getElementById('v-article');
  if (!articleView || articleView.dataset.swipeBound === '1') return;
  articleView.dataset.swipeBound = '1';

  articleView.addEventListener('touchstart', e => {
    if (CUR_VIEW !== 'article') return;
    if (e.touches.length !== 1) return;
    if (e.target.closest('a,button,input,textarea,select,label,video,iframe')) return;
    const touch = e.touches[0];
    ARTICLE_SWIPE.active = true;
    ARTICLE_SWIPE.startX = touch.clientX;
    ARTICLE_SWIPE.startY = touch.clientY;
    ARTICLE_SWIPE.time = Date.now();
  }, { passive: true });

  articleView.addEventListener('touchend', e => {
    if (!ARTICLE_SWIPE.active || CUR_VIEW !== 'article') return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - ARTICLE_SWIPE.startX;
    const dy = touch.clientY - ARTICLE_SWIPE.startY;
    const dt = Date.now() - ARTICLE_SWIPE.time;
    ARTICLE_SWIPE.active = false;

    if (dt > 700) return;
    if (Math.abs(dx) < 60) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.15) return;

    if (dx > 0) navAdjacentPost(1);
    else navAdjacentPost(-1);
  }, { passive: true });

  articleView.addEventListener('touchcancel', () => {
    ARTICLE_SWIPE.active = false;
  }, { passive: true });
}

function updatePullIndicator(distance = 0, refreshing = false) {
  const main = document.getElementById('main');
  const indicator = document.getElementById('pull-indicator');
  const label = document.getElementById('pull-label');
  if (!main || !indicator || !label) return;
  main.style.setProperty('--pull-offset', `${distance}px`);
  indicator.style.setProperty('--pull-distance', `${distance}px`);
  indicator.classList.toggle('ready', distance >= 86 && !refreshing);
  indicator.classList.toggle('refreshing', refreshing);
  label.textContent = refreshing
    ? 'Refreshing...'
    : (distance >= 86 ? 'Release to refresh' : 'Pull to refresh');
}

function resetPullIndicator() {
  const main = document.getElementById('main');
  const indicator = document.getElementById('pull-indicator');
  if (!main || !indicator) return;
  main.classList.remove('is-pulling', 'pull-refreshing');
  updatePullIndicator(0, false);
}

async function refreshAppContent(source = 'manual') {
  const shouldFetchFromFiles = typeof USE_CONTENT_MANIFEST !== 'undefined' && USE_CONTENT_MANIFEST;
  if (shouldFetchFromFiles) await loadContentFromFolders();

  renderHome();
  renderBlog();
  renderProjects();
  renderResources();
  renderTools();
  renderRightRail();
  updateQuickbar();

  if (CUR_VIEW === 'article' && CUR_POST) loadArticle(CUR_POST);
  if (CUR_VIEW === 'project' && CUR_PROJECT) loadProjectDetail(CUR_PROJECT);
  if (CUR_VIEW === 'resource' && CUR_RESOURCE) loadResourceDetail(CUR_RESOURCE);

  if (source === 'pull') toast('Content refreshed');
}

async function triggerPullRefresh() {
  if (PULL_REFRESH.refreshing) return;
  const main = document.getElementById('main');
  if (!main) return;
  PULL_REFRESH.refreshing = true;
  main.classList.add('pull-refreshing');
  updatePullIndicator(PULL_REFRESH.distance, true);
  const start = Date.now();
  try {
    await refreshAppContent('pull');
  } catch (_) {
    toast('Refresh failed', 'error');
  }
  const elapsed = Date.now() - start;
  if (elapsed < 420) await new Promise(r => setTimeout(r, 420 - elapsed));
  PULL_REFRESH.refreshing = false;
  PULL_REFRESH.active = false;
  PULL_REFRESH.tracking = false;
  PULL_REFRESH.distance = 0;
  resetPullIndicator();
}

function initPullToRefresh() {
  const main = document.getElementById('main');
  if (!main || main.dataset.pullBound === '1') return;
  main.dataset.pullBound = '1';

  const finishPull = () => {
    if (PULL_REFRESH.refreshing) return;
    const shouldRefresh = PULL_REFRESH.distance >= 86;
    PULL_REFRESH.tracking = false;
    PULL_REFRESH.active = false;
    if (shouldRefresh) {
      triggerPullRefresh();
      return;
    }
    PULL_REFRESH.distance = 0;
    resetPullIndicator();
  };

  main.addEventListener('touchstart', e => {
    if (!isMobileViewport()) return;
    if (isReadingModeActive()) return;
    if (PULL_REFRESH.refreshing) return;
    if (main.scrollTop > 0) return;
    if (e.touches.length !== 1) return;
    PULL_REFRESH.tracking = true;
    PULL_REFRESH.startY = e.touches[0].clientY;
    PULL_REFRESH.distance = 0;
  }, { passive: true });

  main.addEventListener('touchmove', e => {
    if (!PULL_REFRESH.tracking || PULL_REFRESH.refreshing) return;
    if (isReadingModeActive()) return;
    const dy = e.touches[0].clientY - PULL_REFRESH.startY;
    if (dy <= 0) return;
    if (main.scrollTop > 0) return;

    PULL_REFRESH.active = true;
    PULL_REFRESH.distance = Math.min(124, dy * 0.42);
    main.classList.add('is-pulling');
    updatePullIndicator(PULL_REFRESH.distance, false);
    e.preventDefault();
  }, { passive: false });

  main.addEventListener('touchend', finishPull, { passive: true });
  main.addEventListener('touchcancel', () => {
    PULL_REFRESH.tracking = false;
    PULL_REFRESH.active = false;
    PULL_REFRESH.distance = 0;
    resetPullIndicator();
  }, { passive: true });
}

/* ─── Mobile ──────────────────────────────────────────────── */
function openMob() {
  document.getElementById('left-rail').classList.add('open');
  document.body.classList.add('mob-open');
}
function closeMob() {
  document.getElementById('left-rail').classList.remove('open');
  document.body.classList.remove('mob-open');
}

function initMobileRailDismiss() {
  document.addEventListener('pointerdown', e => {
    if (!isMobileViewport()) return;
    if (!document.body.classList.contains('mob-open')) return;
    if (e.target.closest('#left-rail')) return;
    if (e.target.closest('.mob-menu-btn')) return;
    closeMob();
  });
}

function initToolsRailDismiss() {
  document.addEventListener('pointerdown', e => {
    if (!isMobileViewport()) return;
    if (!document.body.classList.contains('tools-rail-mobile-open')) return;
    if (e.target.closest('#tools-rail')) return;
    if (e.target.closest('.mob-tools-btn')) return;
    closeToolsRail();
  });
}

function syncMobileToolsBtn() {
  const btn = document.querySelector('.mob-tools-btn');
  if (!btn) return;
  btn.style.display = CUR_VIEW === 'tools' ? '' : 'none';
}

/* ─── Toast ───────────────────────────────────────────────── */
function toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = msg;
  const wrap = document.getElementById('toasts');
  wrap.appendChild(t);
  while (wrap.children.length > 3) {
    wrap.firstElementChild.remove();
  }
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 2800);
}

let PAGE_LOADING_TIMER = null;
let NAV_LOADING_TIMER = null;
function finishLoadingScreen(wrap) {
  if (!wrap) return;
  const bar = wrap.querySelector('.ld-bar');
  if (bar) {
    bar.classList.add('finish');
  }
  setTimeout(() => wrap.classList.add('gone'), 260);
}
function flashPageLoading(label = 'Loading...', duration = 800) {
  const wrap = document.getElementById('loading');
  if (!wrap) return;
  const wasHidden = wrap.classList.contains('gone');
  const text = wrap.querySelector('.ld-text');
  if (text) text.textContent = label;
  const boot = document.getElementById('ld-boot');
  if (boot) boot.textContent = '';
  const bar = wrap.querySelector('.ld-bar');
  if (bar) {
    bar.classList.remove('finish');
    bar.style.animation = 'none';
    bar.offsetHeight;
    bar.style.animation = '';
  }
  if (wasHidden) wrap.classList.remove('gone');
  clearTimeout(PAGE_LOADING_TIMER);
  PAGE_LOADING_TIMER = setTimeout(() => finishLoadingScreen(wrap), Math.max(300, duration));
}

function getLoadingLabel(view, id) {
  if (view === 'article' && id && typeof DB !== 'undefined') {
    const post = DB.posts.find(p => p.id === id);
    if (post && post.title) return `Loading ${post.title}`;
    return 'Loading Blog Post';
  }
  if (view === 'project' && id && typeof DB !== 'undefined') {
    const proj = DB.projects.find(p => p.id === id);
    if (proj && proj.name) return `Loading ${proj.name}`;
    return 'Loading Project';
  }
  if (view === 'resource' && id && typeof DB !== 'undefined') {
    const res = DB.resources.find(r => r.id === id);
    if (res && res.title) return `Loading ${res.title}`;
    return 'Loading Resource';
  }
  const viewLabelMap = {
    home: 'Home',
    blog: 'Blog',
    projects: 'Projects',
    resources: 'Resources',
    tools: 'Tools',
    about: 'About',
  };
  const label = viewLabelMap[view] || (view ? view.charAt(0).toUpperCase() + view.slice(1) : 'Page');
  return `Loading ${label}`;
}

/* ─── SFX helpers ─────────────────────────────────────────── */
function canPlaySfx() {
  return typeof isSfxEnabled === 'function' ? isSfxEnabled() : !!SFX_ENABLED;
}
function playSfx(name) {
  if (typeof window.__playSynthSfx === 'function') window.__playSynthSfx(name);
}
function setSfxEnabled(enabled) {
  SFX_ENABLED = !!enabled;
  if (typeof window.__setSynthSfxEnabled === 'function') window.__setSynthSfxEnabled(SFX_ENABLED);
  else localStorage.setItem('sfx_enabled', JSON.stringify(SFX_ENABLED));
  document.getElementById('sfx-toggle-btn')?.classList.toggle('active', SFX_ENABLED);
  toast(`Sound effects ${SFX_ENABLED ? 'enabled' : 'disabled'}`);
}
function toggleSfx(event) {
  event?.preventDefault(); event?.stopPropagation();
  setSfxEnabled(!canPlaySfx());
  playSfx('toggle');
}
function initSfxToggle() {
  SFX_ENABLED = canPlaySfx();
  document.getElementById('sfx-toggle-btn')?.classList.toggle('active', SFX_ENABLED);
}
function copyText(id) {
  const el = document.getElementById(id);
  if (el) navigator.clipboard.writeText(el.textContent || el.value || '').then(() => toast('Copied!'));
}

/* ─── Music wiring ───────────────────────────────────────── */
function wireLocalMusic() {
  const TRACK_MAP = {
    'No One Ever Said':                { src: (DB.site.repo || '') + 'assets/music/No%20One%20Ever%20Said.mp3',                              cover: (DB.site.repo || '') + 'assets/music/covers/No%20One%20Ever%20Said.png'                              },
    'Rises The Moon':                  { src: (DB.site.repo || '') + 'assets/music/Rises%20The%20Moon.mp3',                                  cover: (DB.site.repo || '') + 'assets/music/covers/Rises%20The%20Moon.png'                                  },
    'Sorry, I Like You':               { src: (DB.site.repo || '') + 'assets/music/Sorry%2C%20I%20Like%20You.mp3',                           cover: (DB.site.repo || '') + 'assets/music/covers/Sorry%2C%20I%20Like%20You.png'                           },
    'Wet':                             { src: (DB.site.repo || '') + 'assets/music/Wet.mp3',                                                 cover: (DB.site.repo || '') + 'assets/music/covers/Wet.png'                                                 },
    "World's Number One Oden Store":   { src: (DB.site.repo || '') + "assets/music/World%27s%20Number%20One%20Oden%20Store.mp3",            cover: (DB.site.repo || '') + "assets/music/covers/World%27s%20Number%20One%20Oden%20Store.png"            },
  };
  DB.music = DB.music.map((track, idx) => {
    const mapped = TRACK_MAP[track.title];
    if (!mapped) return track;
    return { ...track, id: track.id || `local-${idx + 1}`, src: mapped.src, cover: mapped.cover };
  }).filter(t => t.src);
  if (TRACK_IDX >= DB.music.length) TRACK_IDX = 0;
}

/* ─── Boot sequence ──────────────────────────────────────── */
const BOOT_MSGS = (typeof BOOT_MESSAGES !== 'undefined')
  ? BOOT_MESSAGES
  : ['<span>SYS</span> :: Initializing...', '<span>OK</span>  :: Ready.'];

let bootIdx = 0;
function bootTick() {
  const el = document.getElementById('ld-boot');
  if (el && bootIdx < BOOT_MSGS.length) {
    el.innerHTML = BOOT_MSGS[bootIdx++];
    setTimeout(bootTick, 180);
  }
}

/* ─── Init ───────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', async () => {
  bootTick();
  const loader = document.getElementById('loading');
  if (loader) setTimeout(() => finishLoadingScreen(loader), 1500);
  applyDefaults();
  applySiteMeta();
  renderNav();
  applyHeroConfig();
  applyFeatureFlags();
  applySeoMeta();

  if (typeof USE_CONTENT_MANIFEST !== 'undefined' && USE_CONTENT_MANIFEST) {
    await loadContentFromFolders();
  }

  wireLocalMusic();
  renderHome();
  renderBlog();
  renderProjects();
  renderResources();
  renderTools();
  renderRightRail();
  initThemes();
  initSfxToggle();
  initPlayer();
  if (typeof syncPlayerSheetState === 'function') syncPlayerSheetState();
  updateQuickbar();
  initArticleSwipeNavigation();
  initPullToRefresh();
  initMobileRailDismiss();
  initToolsRailDismiss();
  syncMobileToolsBtn();
  syncReadingModeClass();

  if (typeof DEFAULTS !== 'undefined' && DEFAULTS.musicAutoplay) {
    setTimeout(() => {
      if (!IS_PLAYING) togglePlay();
    }, 350);
  }

  // About page content from config
  const aboutEl = document.getElementById('about-md');
  if (aboutEl && typeof ABOUT_CONTENT !== 'undefined') {
    renderMarkdown(ABOUT_CONTENT, aboutEl);
  }

  window.addEventListener('resize', () => {
    if (typeof getBlogPageSize === 'function' && BLOG_PAGE_SIZE !== getBlogPageSize()) renderBlog();
    if (typeof syncPlayerSheetState === 'function') syncPlayerSheetState();
    syncReadingModeClass();
  });

  // Hash routing
  const hash = location.hash.slice(1);
  if (hash) {
    const p = DB.posts.find(x => x.id === hash);
    if (p) nav('article', hash);
  } else if (typeof DEFAULTS !== 'undefined' && DEFAULTS.defaultView) {
    nav(DEFAULTS.defaultView);
  }
});

/* Attempt to load file-based content from the `content/` folder.
   This is defensive: if the manifest or files aren't present, we silently
   fall back to the inlined `DB` defined in `config.js`. */
async function loadContentFromFolders() {
  if (typeof USE_CONTENT_MANIFEST !== 'undefined' && !USE_CONTENT_MANIFEST) return;
  try {
    const resp = await fetch((DB.site.repo || '') + 'content/content.json');
    if (!resp.ok) return;
    const manifest = await resp.json();

    // Load posts listed in POST_MANIFEST
    if (manifest.POST_MANIFEST && Array.isArray(manifest.POST_MANIFEST) && manifest.POST_MANIFEST.length) {
      const loaded = [];
      for (const name of manifest.POST_MANIFEST) {
        try {
          const slug = slugifyName(name);
          const mdResp = await fetchFirstOk([
            (DB.site.repo || '') + `content/posts/${encodeURIComponent(name)}/${encodeURIComponent(name)}.md`,
            (DB.site.repo || '') + `content/posts/${encodeURIComponent(name)}/${encodeURIComponent(slug)}.md`,
          ]);
          if (!mdResp) continue;
          const md = await mdResp.text();
          const { meta, body } = parseFrontmatter(md);
          const tags = splitList(meta.tags);
          const readTime = parseInt(meta.readTime, 10) || estimateReadTime(body);
          loaded.push({
            id: meta.id || slug,
            title: meta.title || name,
            description: meta.description || meta.desc || '',
            date: meta.date || new Date().toISOString().slice(0,10),
            tags,
            readTime,
            cover: meta.cover || null,
            markdown: body.trim(),
          });
        } catch (e) { continue; }
      }
      if (loaded.length) DB.posts = loaded;
    }

    if (manifest.PROJECT_MANIFEST && Array.isArray(manifest.PROJECT_MANIFEST) && manifest.PROJECT_MANIFEST.length) {
      const loaded = [];
      for (const name of manifest.PROJECT_MANIFEST) {
        try {
          const slug = slugifyName(name);
          const mdResp = await fetchFirstOk([
            (DB.site.repo || '') + `content/projects/${encodeURIComponent(name)}/${encodeURIComponent(slug)}.md`,
            (DB.site.repo || '') + `content/projects/${encodeURIComponent(name)}/${encodeURIComponent(name)}.md`,
          ]);
          if (!mdResp) continue;
          const md = await mdResp.text();
          const { meta, body } = parseFrontmatter(md);
          loaded.push({
            id: meta.id || slug,
            name: meta.name || name,
            description: meta.description || '',
            category: meta.category || 'Development',
            focus: meta.focus || '',
            type: meta.type || 'Project',
            icon: meta.icon || 'terminal',
            stack: splitList(meta.stack),
            url: meta.url || '',
            repo: meta.repo || '',
            live: meta.live || '',
            video: meta.video || '',
            gallery: parseGallery(meta.gallery),
            featured: String(meta.featured).toLowerCase() === 'true',
            cover: meta.cover || null,
            badge: meta.badge || '',
            markdown: body.trim(),
          });
        } catch (e) { continue; }
      }
      if (loaded.length) DB.projects = loaded;
    }

    if (manifest.RESOURCE_MANIFEST && Array.isArray(manifest.RESOURCE_MANIFEST) && manifest.RESOURCE_MANIFEST.length) {
      const loaded = [];
      const dirs = getResourceDirs();
      for (const name of manifest.RESOURCE_MANIFEST) {
        try {
          const slug = slugifyName(name);
          const base = encodeURIComponent(name);
          const candidates = [];
          dirs.forEach(dir => {
            const d = encodeURIComponent(dir);
            candidates.push((DB.site.repo || '') + `content/resources/${d}/${base}/${encodeURIComponent(slug)}.md`);
            candidates.push((DB.site.repo || '') + `content/resources/${d}/${base}/${encodeURIComponent(name)}.md`);
          });
          const mdResp = await fetchFirstOk(candidates);
          if (!mdResp) continue;
          const md = await mdResp.text();
          const { meta, body } = parseFrontmatter(md);
          loaded.push({
            id: meta.id || slug,
            title: meta.title || name,
            desc: meta.desc || meta.description || '',
            type: meta.type || 'Guide',
            difficulty: meta.difficulty || '',
            url: meta.url || '',
            cover: meta.cover || null,
            video: meta.video || '',
            gallery: parseGallery(meta.gallery),
            steps: splitList(meta.steps),
            quickLinks: parseQuickLinks(meta.quickLinks),
            markdown: body.trim(),
          });
        } catch (e) { continue; }
      }
      if (loaded.length) DB.resources = loaded;
    }
  } catch (e) {
    // ignore and use inlined DB
    return;
  }
}
