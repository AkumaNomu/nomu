/* ================================================================
   THEMES.JS - Accent colour system (config-driven)
================================================================ */
let THEME_PANEL_OPEN = true;

function isThemeMobileViewport() {
  return window.matchMedia('(max-width: 860px)').matches;
}

function setThemeSectionOpen(open, persist = true) {
  const section = document.getElementById('theme-section');
  const toggle = section?.querySelector('.theme-toggle');
  if (!section || !toggle) return;
  THEME_PANEL_OPEN = !!open;
  section.classList.toggle('collapsed', !THEME_PANEL_OPEN);
  toggle.setAttribute('aria-expanded', String(THEME_PANEL_OPEN));
  if (persist) localStorage.setItem('theme_section_open', JSON.stringify(THEME_PANEL_OPEN));
}

function toggleThemeSection() {
  setThemeSectionOpen(!THEME_PANEL_OPEN, true);
  playSfx('toggle');
}

function initThemes() {
  const themes = (typeof THEMES !== 'undefined') ? THEMES : [
    { name: 'Cyan',   h: 175, s: '100%', l: '52%', c: '#00d4b4' },
    { name: 'Purple', h: 265, s: '80%',  l: '62%', c: '#9f6ef7' },
  ];
  const saved = parseInt(localStorage.getItem('themeIdx') || '0');
  applyTheme(saved, false, themes);

  const swatchEl = document.getElementById('swatches');
  if (swatchEl) {
    swatchEl.innerHTML = themes.map((t, i) =>
      `<div class="swatch ${i === saved ? 'active' : ''}" style="background:${t.c}" title="${t.name}" onclick="applyTheme(${i},true)"></div>`
    ).join('');
  }

  const savedOpen = localStorage.getItem('theme_section_open');
  const defaultOpen = !isThemeMobileViewport();
  let panelOpen = defaultOpen;
  if (savedOpen !== null) {
    try { panelOpen = JSON.parse(savedOpen); } catch (_) { panelOpen = defaultOpen; }
  }
  setThemeSectionOpen(!!panelOpen, false);
}

function applyTheme(idx, notify, themesOverride) {
  const themes = themesOverride || (typeof THEMES !== 'undefined' ? THEMES : []);
  const t = themes[idx] || themes[0];
  if (!t) return;
  const r = document.documentElement;
  const sVal = parseFloat(String(t.s || '').replace('%', ''));
  const lVal = parseFloat(String(t.l || '').replace('%', ''));
  const cVal = String(t.c || '').toLowerCase();
  const isNeutral = (Number.isFinite(sVal) && sVal <= 5)
    || (Number.isFinite(lVal) && lVal >= 95)
    || cVal === '#fff'
    || cVal === '#ffffff';
  r.style.setProperty('--ah', t.h);
  r.style.setProperty('--as', t.s);
  r.style.setProperty('--al', t.l);
  if (isNeutral) {
    const accent = t.c || '#ffffff';
    r.style.setProperty('--accent', accent);
    r.style.setProperty('--accent2', '#dfe6f3');
    r.style.setProperty('--accent-dim', '#aab4c5');
    r.style.setProperty('--accent-glow', 'rgba(255,255,255,0.18)');
    r.style.setProperty('--accent-glow2', 'rgba(255,255,255,0.08)');
    r.style.setProperty('--accent-subtle', 'rgba(255,255,255,0.08)');
    r.style.setProperty('--border-a', 'rgba(255,255,255,0.22)');
  } else {
    r.style.setProperty('--accent',        `hsl(${t.h},${t.s},${t.l})`);
    r.style.setProperty('--accent2',       `hsl(${t.h + 40},80%,55%)`);
    r.style.setProperty('--accent-dim',    `hsl(${t.h},${t.s},32%)`);
    r.style.setProperty('--accent-glow',   `hsl(${t.h},${t.s},${t.l},0.2)`);
    r.style.setProperty('--accent-glow2',  `hsl(${t.h},${t.s},${t.l},0.07)`);
    r.style.setProperty('--accent-subtle', `hsl(${t.h},50%,9%)`);
    r.style.setProperty('--border-a',      `hsl(${t.h},${t.s},${t.l},0.26)`);
  }
  document.querySelectorAll('.swatch').forEach((s, i) => s.classList.toggle('active', i === idx));
  localStorage.setItem('themeIdx', idx);
  if (notify) toast(`Theme: ${t.name}`);
}
