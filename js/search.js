/* ================================================================
   SEARCH.JS - Terminal command palette (commands only)
================================================================ */

/* --- State ------------------------------------------------------ */
let SEARCH_FOCUS_IDX = -1;
let SEARCH_ALL_ITEMS = [];
let SEARCH_CMD_SUGGESTIONS = [];
let HISTORY_IDX = -1;

const TERMINAL_HISTORY_KEY = 'terminal_history';
const LEGACY_HISTORY_KEY = 'search_history';
let TERMINAL_HISTORY = [];

function loadTerminalHistory() {
  const legacy = localStorage.getItem(LEGACY_HISTORY_KEY);
  const current = localStorage.getItem(TERMINAL_HISTORY_KEY);
  if (current) {
    try { return JSON.parse(current) || []; } catch (_) { return []; }
  }
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) || [];
      localStorage.setItem(TERMINAL_HISTORY_KEY, JSON.stringify(parsed));
      return parsed;
    } catch (_) {
      return [];
    }
  }
  return [];
}

function saveTerminalHistory() {
  localStorage.setItem(TERMINAL_HISTORY_KEY, JSON.stringify(TERMINAL_HISTORY));
}

TERMINAL_HISTORY = loadTerminalHistory();

const COMMANDS = [
  { cmd: 'help',      args: '',                              desc: 'Show all commands', aliases: ['?'] },
  { cmd: 'page',      args: '<view>',                        desc: 'Go to a page (home, blog, projects, resources, tools, about)', aliases: ['nav', 'goto'] },
  { cmd: 'tool',      args: '<tool name>',                   desc: 'Open a tool', aliases: ['tools'] },
  { cmd: 'blog',      args: '<post title>',                  desc: 'Open a blog post', aliases: ['post'] },
  { cmd: 'project',   args: '<project title>',               desc: 'Open a project', aliases: ['proj'] },
  { cmd: 'resource',  args: '<resource name>',               desc: 'Open a resource', aliases: ['res'] },
  { cmd: 'volume',    args: '<0-100>',                       desc: 'Set music volume', aliases: ['vol'] },
  { cmd: 'song',      args: '<next|prev|play|pause|toggle|name>', desc: 'Control music playback', aliases: ['music', 'track'] },
  { cmd: 'sfx',       args: 'on|off|1|0',                    desc: 'Toggle sound effects', aliases: ['sound'] },
  { cmd: 'color',     args: 'theme <name> | hex <#rrggbb>',  desc: 'Set accent color', aliases: ['theme', 'accent'] },
  { cmd: 'filter',    args: 'blog|projects|resources ...',   desc: 'Apply view filters', aliases: ['filters'] },
  { cmd: 'reading',   args: 'on|off|toggle',                 desc: 'Toggle reading mode', aliases: ['read'] },
  { cmd: 'favorites', args: 'tools <show|hide|toggle>',      desc: 'Tools favorites filter', aliases: ['fav'] },
];

const COMMAND_NAV_VIEWS = ['home', 'blog', 'projects', 'resources', 'tools', 'about'];
const SONG_ACTIONS = ['next', 'prev', 'previous', 'skip', 'play', 'pause', 'toggle'];

const COMMAND_INDEX = new Map();
COMMANDS.forEach(c => {
  COMMAND_INDEX.set(c.cmd, c.cmd);
  (c.aliases || []).forEach(a => COMMAND_INDEX.set(a, c.cmd));
});

/* --- Open / Close ------------------------------------------------ */
function openSearch() {
  const modal = document.getElementById('search-modal');
  modal.classList.add('open');
  document.body.classList.add('search-open');
  playSfx('scan');
  setTimeout(() => {
    const inp = document.getElementById('search-input');
    if (inp) inp.focus();
    runTerminalIntro();
  }, 60);
}

function closeSearch(e) {
  if (!e || e.target === document.getElementById('search-modal')) {
    document.getElementById('search-modal').classList.remove('open');
    document.body.classList.remove('search-open');
    const inp = document.getElementById('search-input');
    if (inp) inp.value = '';
    document.getElementById('search-results').innerHTML = buildEmptyState();
    SEARCH_FOCUS_IDX = -1;
    SEARCH_ALL_ITEMS = [];
    HISTORY_IDX = -1;
  }
}

function openTerminal() { openSearch(); }
function closeTerminal(e) { closeSearch(e); }

/* --- Intro / Empty ---------------------------------------------- */
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function runTerminalIntro() {
  const results = document.getElementById('search-results');
  const recents = TERMINAL_HISTORY.slice(0, 4).map(q =>
    `<span class="stb-hist" onclick='searchFromHistory(${JSON.stringify(q)})'>${escHtml(q)}</span>`
  ).join(' · ');

  results.innerHTML = `
    <div class="search-terminal-boot">
      <div class="stb-line"><span class="stb-tag">SYS</span> :: Terminal subsystem online</div>
      <div class="stb-line"><span class="stb-tag accent">RDY</span> :: Type <kbd>help</kbd> to list commands</div>
      ${TERMINAL_HISTORY.length ? `<div class="stb-line"><span class="stb-tag dim">HIS</span> :: Recent: ${recents}</div>` : ''}
    </div>`;
}

function buildEmptyState() {
  return `<div class="search-empty">${TERMINAL_HISTORY.length
    ? `<span>Last command: <em>${escHtml(TERMINAL_HISTORY[0])}</em></span>`
    : '<span>Type a command or run <em>help</em></span>'}</div>`;
}

function searchFromHistory(q) {
  const inp = document.getElementById('search-input');
  if (inp) {
    inp.value = q;
    inp.dispatchEvent(new Event('input'));
  }
}

/* --- Icon map ---------------------------------------------------- */
const SEARCH_ICONS = {
  cmd: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
};

/* --- Command helpers -------------------------------------------- */
function getThemeList() {
  return (typeof THEMES !== 'undefined' && Array.isArray(THEMES)) ? THEMES : [];
}

function resolveThemeIndex(query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return -1;
  const themes = getThemeList();
  let idx = themes.findIndex(t => (t.name || '').toLowerCase() === needle);
  if (idx !== -1) return idx;
  idx = themes.findIndex(t => (t.name || '').toLowerCase().startsWith(needle));
  return idx;
}

function normalizeCommandToken(token) {
  return COMMAND_INDEX.get(token) || token;
}

function findCommand(token) {
  const norm = normalizeCommandToken(token);
  return COMMANDS.find(c => c.cmd === norm) || null;
}

function findBestMatch(list, query, fields) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return null;
  const fieldVal = (item, field) => String(item[field] || '').toLowerCase();
  const exact = list.find(item => fields.some(f => fieldVal(item, f) === needle));
  if (exact) return exact;
  const starts = list.find(item => fields.some(f => fieldVal(item, f).startsWith(needle)));
  if (starts) return starts;
  return list.find(item => fields.some(f => fieldVal(item, f).includes(needle))) || null;
}

function looksLikeHex(value) {
  const v = String(value || '').trim();
  return /^#?[0-9a-fA-F]{6}$/.test(v);
}

function hexToHsl(hex) {
  const raw = hex.replace('#', '');
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h *= 60;
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function applyCustomTheme(hex) {
  const color = hex.startsWith('#') ? hex : `#${hex}`;
  const hsl = hexToHsl(color);
  const r = document.documentElement;
  r.style.setProperty('--ah', hsl.h);
  r.style.setProperty('--as', `${hsl.s}%`);
  r.style.setProperty('--al', `${hsl.l}%`);
  r.style.setProperty('--accent', `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`);
  r.style.setProperty('--accent-dim', `hsl(${hsl.h},${hsl.s}%,32%)`);
  r.style.setProperty('--accent-glow', `hsl(${hsl.h},${hsl.s}%,${hsl.l}%,0.2)`);
  r.style.setProperty('--accent-glow2', `hsl(${hsl.h},${hsl.s}%,${hsl.l}%,0.07)`);
  r.style.setProperty('--accent-subtle', `hsl(${hsl.h},50%,9%)`);
  r.style.setProperty('--border-a', `hsl(${hsl.h},${hsl.s}%,${hsl.l}%,0.26)`);
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  localStorage.setItem('themeIdx', '-1');
  localStorage.setItem('theme_custom', color);
}

function fillSearchInput(val) {
  const inp = document.getElementById('search-input');
  if (!inp) return;
  inp.value = val;
  inp.focus();
  inp.dispatchEvent(new Event('input'));
}

function getAutocompleteValue() {
  if (SEARCH_FOCUS_IDX !== -1) return SEARCH_ALL_ITEMS[SEARCH_FOCUS_IDX]?.value;
  return SEARCH_ALL_ITEMS[0]?.value;
}

function makeFillSuggestion(cmdLine, sub, badge = 'CMD') {
  const value = cmdLine.endsWith(' ') ? cmdLine : `${cmdLine} `;
  return {
    icon: 'cmd',
    title: cmdLine,
    sub,
    act: `fillSearchInput(${JSON.stringify(`${value}`)})`,
    badge,
    value: value.trim(),
  };
}

function makeRunSuggestion(cmdLine, sub, badge = 'RUN') {
  return {
    icon: 'cmd',
    title: cmdLine,
    sub,
    act: `executeCommand(${JSON.stringify(`${cmdLine}`)})`,
    badge,
    value: cmdLine.trim(),
  };
}

function collectCommandSuggestions(q) {
  const raw = String(q || '');
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const hasTrailingSpace = /\s$/.test(raw);

  if (!tokens.length) {
    return COMMANDS.map(c => makeFillSuggestion(c.cmd, `${c.desc}${c.args ? ` (${c.args})` : ''}`));
  }

  const tokenRaw = tokens[0].toLowerCase();
  const tokenNorm = normalizeCommandToken(tokenRaw);
  const argText = tokens.slice(1).join(' ');
  const argLower = argText.toLowerCase();

  if (tokens.length === 1 && !hasTrailingSpace) {
    return COMMANDS
      .filter(c =>
        c.cmd.startsWith(tokenNorm) ||
        (c.aliases || []).some(a => a.startsWith(tokenRaw)) ||
        c.desc.toLowerCase().includes(tokenNorm)
      )
      .map(c => makeFillSuggestion(c.cmd, `${c.desc}${c.args ? ` (${c.args})` : ''}`));
  }

  switch (tokenNorm) {
    case 'page':
      return COMMAND_NAV_VIEWS
        .filter(v => v.includes(argLower))
        .map(v => makeRunSuggestion(`page ${v}`, `Go to ${v}`, 'NAV'));
    case 'tool':
      return (DB.tools || [])
        .filter(t => (t.name || '').toLowerCase().includes(argLower))
        .slice(0, 8)
        .map(t => makeRunSuggestion(`tool ${t.name}`, `Open ${t.name}`, 'TOOL'));
    case 'blog':
      return (DB.posts || [])
        .filter(p => (p.title || '').toLowerCase().includes(argLower))
        .slice(0, 8)
        .map(p => makeRunSuggestion(`blog ${p.title}`, `Open ${p.title}`, 'POST'));
    case 'project':
      return (DB.projects || [])
        .filter(p => (p.name || '').toLowerCase().includes(argLower))
        .slice(0, 8)
        .map(p => makeRunSuggestion(`project ${p.name}`, `Open ${p.name}`, 'PROJ'));
    case 'resource':
      return (DB.resources || [])
        .filter(r => (r.title || '').toLowerCase().includes(argLower))
        .slice(0, 8)
        .map(r => makeRunSuggestion(`resource ${r.title}`, `Open ${r.title}`, 'RES'));
    case 'volume':
      return [0, 25, 50, 75, 100]
        .filter(v => String(v).startsWith(argLower))
        .map(v => makeRunSuggestion(`volume ${v}`, `Set volume to ${v}`, 'VOL'));
    case 'song':
      if (!argLower || SONG_ACTIONS.some(a => a.startsWith(argLower))) {
        const actions = SONG_ACTIONS
          .filter(a => a.startsWith(argLower))
          .map(a => makeRunSuggestion(`song ${a}`, `Music ${a}`, 'MUSIC'));
        const tracks = (DB.music || [])
          .filter(t => (t.title || '').toLowerCase().includes(argLower))
          .slice(0, 6)
          .map(t => makeRunSuggestion(`song ${t.title}`, `Play ${t.title}`, 'TRACK'));
        return [...actions, ...tracks];
      }
      return (DB.music || [])
        .filter(t => (t.title || '').toLowerCase().includes(argLower))
        .slice(0, 8)
        .map(t => makeRunSuggestion(`song ${t.title}`, `Play ${t.title}`, 'TRACK'));
    case 'sfx':
      return ['on', 'off', '1', '0']
        .filter(v => v.includes(argLower))
        .map(v => makeRunSuggestion(`sfx ${v}`, `SFX ${v}`, 'SFX'));
    case 'color':
      if (argLower.startsWith('theme')) {
        const name = argLower.replace(/^theme\s*/, '');
        return getThemeList()
          .filter(t => (t.name || '').toLowerCase().includes(name))
          .map(t => makeRunSuggestion(`color theme ${t.name}`, `Theme ${t.name}`, 'THEME'));
      }
      if (argLower.startsWith('hex')) {
        return [makeRunSuggestion('color hex #00d4b4', 'Set custom hex color', 'HEX')];
      }
      return [
        makeFillSuggestion('color theme ', 'Theme name'),
        makeFillSuggestion('color hex ', 'Custom hex color'),
      ];
    case 'filter':
      if (!argLower) {
        return [
          makeFillSuggestion('filter blog ', 'Filter blog by tag'),
          makeFillSuggestion('filter projects category ', 'Filter projects by category'),
          makeFillSuggestion('filter projects focus ', 'Filter projects by focus'),
          makeFillSuggestion('filter resources type ', 'Filter resources by type'),
        ];
      }
      if (argLower.startsWith('blog')) {
        const q2 = argLower.replace(/^blog\s*/, '');
        return ['all', ...getAllTags()]
          .filter(t => t.toLowerCase().includes(q2))
          .slice(0, 8)
          .map(t => makeRunSuggestion(`filter blog ${t}`, `Blog: ${t}`, 'TAG'));
      }
      if (argLower.startsWith('projects category')) {
        const q2 = argLower.replace(/^projects category\s*/, '');
        const cats = typeof PROJECT_CATEGORIES !== 'undefined' ? PROJECT_CATEGORIES : ['All'];
        return cats
          .filter(c => c.toLowerCase().includes(q2))
          .map(c => makeRunSuggestion(`filter projects category ${c}`, `Projects: ${c}`, 'CAT'));
      }
      if (argLower.startsWith('projects focus')) {
        const q2 = argLower.replace(/^projects focus\s*/, '');
        const focusMap = typeof PROJECT_FOCUS_MAP !== 'undefined' ? PROJECT_FOCUS_MAP : {};
        const allFocus = Object.values(focusMap).flat().filter(Boolean);
        return allFocus
          .filter(f => f.toLowerCase().includes(q2))
          .map(f => makeRunSuggestion(`filter projects focus ${f}`, `Focus: ${f}`, 'FOCUS'));
      }
      if (argLower.startsWith('resources type')) {
        const q2 = argLower.replace(/^resources type\s*/, '');
        const types = typeof RESOURCE_TYPES !== 'undefined' ? RESOURCE_TYPES : ['All'];
        return types
          .filter(t => t.toLowerCase().includes(q2))
          .map(t => makeRunSuggestion(`filter resources type ${t}`, `Resources: ${t}`, 'TYPE'));
      }
      return [];
    case 'reading':
      return ['on', 'off', 'toggle']
        .filter(v => v.includes(argLower))
        .map(v => makeRunSuggestion(`reading ${v}`, `Reading mode ${v}`, 'READ'));
    case 'favorites':
      if (!argLower) return [makeFillSuggestion('favorites tools ', 'Show or hide tools favorites filter')];
      return ['show', 'hide', 'toggle']
        .filter(v => v.includes(argLower.replace('tools ', '')))
        .map(v => makeRunSuggestion(`favorites tools ${v}`, `Favorites ${v}`, 'FAV'));
    case 'help':
      return [makeRunSuggestion('help', 'Show all commands', 'HELP')];
    default:
      return COMMANDS
        .filter(c => c.cmd.includes(tokenNorm) || (c.aliases || []).some(a => a.includes(tokenRaw)))
        .map(c => makeFillSuggestion(c.cmd, `${c.desc}${c.args ? ` (${c.args})` : ''}`));
  }
}

function collectToolSuggestions(raw) {
  const text = String(raw || '').trim();
  const lower = text.toLowerCase();
  let query = text;
  if (lower.startsWith('tool ')) query = text.slice(5);
  else if (lower.startsWith('tools ')) query = text.slice(6);
  else if (lower === 'tool' || lower === 'tools') query = '';
  const needle = query.toLowerCase();
  return (DB.tools || [])
    .filter(t => (t.name || '').toLowerCase().includes(needle))
    .slice(0, 8)
    .map(t => makeRunSuggestion(`tool ${t.name}`, `Open ${t.name}`, 'TOOL'));
}

function renderGroups(groups) {
  SEARCH_ALL_ITEMS = [];
  let html = '';
  let totalCount = 0;

  Object.entries(groups).forEach(([group, items]) => {
    if (!items.length) return;
    totalCount += items.length;
    html += `<div class="s-group-label">
      <span class="s-group-arrow">></span> ${group}
      <span class="s-group-count">${items.length}</span>
    </div>`;
    html += items.map(it => {
      const idx = SEARCH_ALL_ITEMS.length;
      SEARCH_ALL_ITEMS.push(it);
      return `<div class="s-item" data-idx="${idx}" onclick="${it.act}" onmouseover="focusSearchItem(${idx})">
        <div class="s-item-icon">${SEARCH_ICONS[it.icon] || ''}</div>
        <div class="s-item-body">
          <div class="s-title">${escHtml(it.title)}</div>
          <div class="s-sub">${escHtml((it.sub || '').substring(0, 100))}</div>
        </div>
        <span class="s-badge">${it.badge || ''}</span>
        <span class="s-arrow">-></span>
      </div>`;
    }).join('');
  });

  if (!totalCount) {
    return `<div class="search-empty">
      <div class="search-no-results">
        <span class="snr-code">?</span>
        <span>No command matches</span>
        <span class="snr-hint">Try <em>help</em></span>
      </div>
    </div>`;
  }

  return `<div class="s-count-bar">
    <span><span class="stb-tag accent">CMD</span> ${totalCount} suggestion${totalCount !== 1 ? 's' : ''}</span>
  </div>` + html;
}

/* --- Command execution ------------------------------------------ */
function pushHistory(cmdLine) {
  const cleaned = String(cmdLine || '').trim();
  if (!cleaned) return;
  TERMINAL_HISTORY = [cleaned, ...TERMINAL_HISTORY.filter(x => x !== cleaned)].slice(0, 12);
  saveTerminalHistory();
}

function executeCommand(input) {
  const raw = String(input || '').trim();
  const clean = raw.startsWith('>') ? raw.substring(1).trim() : raw;
  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return;

  const cmdToken = normalizeCommandToken((parts[0] || '').toLowerCase());
  const arg = parts.slice(1).join(' ').trim();
  let keepOpen = false;

  switch (cmdToken) {
    case 'help': {
      const helpList = COMMANDS.map(c =>
        `<div class="stb-line"><span class="stb-tag">${c.cmd.toUpperCase()}</span> :: ${escHtml(c.desc)} ${c.args ? `<em>${escHtml(c.args)}</em>` : ''}</div>`
      ).join('');
      document.getElementById('search-results').innerHTML = `<div class="search-terminal-boot">${helpList}</div>`;
      SEARCH_ALL_ITEMS = [];
      SEARCH_FOCUS_IDX = -1;
      keepOpen = true;
      break;
    }
    case 'page': {
      const target = (arg || '').toLowerCase();
      if (COMMAND_NAV_VIEWS.includes(target)) {
        nav(target);
      } else {
        toast(`Usage: page <${COMMAND_NAV_VIEWS.join('|')}>`);
        keepOpen = true;
      }
      break;
    }
    case 'tool': {
      const tool = findBestMatch(DB.tools || [], arg, ['id', 'name']);
      if (!tool) {
        toast(`Tool not found: ${arg || '(empty)'}`);
        keepOpen = true;
        break;
      }
      nav('tools');
      if (typeof isMobileViewport === 'function' && isMobileViewport()) openToolsRail();
      openTool(tool.id, { scroll: true, source: 'terminal', keepRailOpen: true });
      break;
    }
    case 'blog': {
      const post = findBestMatch(DB.posts || [], arg, ['id', 'title']);
      if (!post) {
        toast(`Post not found: ${arg || '(empty)'}`);
        keepOpen = true;
        break;
      }
      nav('article', post.id);
      break;
    }
    case 'project': {
      const proj = findBestMatch(DB.projects || [], arg, ['id', 'name']);
      if (!proj) {
        toast(`Project not found: ${arg || '(empty)'}`);
        keepOpen = true;
        break;
      }
      nav('project', proj.id);
      break;
    }
    case 'resource': {
      const res = findBestMatch(DB.resources || [], arg, ['id', 'title']);
      if (!res) {
        toast(`Resource not found: ${arg || '(empty)'}`);
        keepOpen = true;
        break;
      }
      nav('resource', res.id);
      break;
    }
    case 'volume': {
      const value = Number(arg);
      if (Number.isNaN(value)) {
        toast('Usage: volume <0-100>');
        keepOpen = true;
        break;
      }
      const vol = Math.max(0, Math.min(100, value));
      const slider = document.getElementById('vol-slider');
      if (slider) slider.value = String(vol / 100);
      if (typeof setVol === 'function') setVol(vol / 100);
      toast(`Volume ${vol}`);
      break;
    }
    case 'song': {
      const action = (arg || '').toLowerCase();
      if (!action) {
        toast('Usage: song <next|prev|play|pause|toggle|name>');
        keepOpen = true;
        break;
      }
      if (SONG_ACTIONS.includes(action)) {
        if (action === 'next' || action === 'skip') nextTrack();
        else if (action === 'prev' || action === 'previous') prevTrack();
        else if (action === 'toggle') togglePlay();
        else if (action === 'play') { if (!IS_PLAYING) togglePlay(); }
        else if (action === 'pause') { if (IS_PLAYING) togglePlay(); }
        break;
      }
      const track = findBestMatch(DB.music || [], arg, ['title', 'id']);
      if (!track) {
        toast(`Track not found: ${arg || '(empty)'}`);
        keepOpen = true;
        break;
      }
      const idx = (DB.music || []).findIndex(t => t === track);
      if (idx !== -1) {
        TRACK_IDX = idx;
        IS_PLAYING = false;
        initPlayer();
        togglePlay();
      }
      break;
    }
    case 'sfx': {
      const mode = arg.toLowerCase();
      if (mode === 'on' || mode === '1') setSfxEnabled(true);
      else if (mode === 'off' || mode === '0') setSfxEnabled(false);
      else {
        toast('Usage: sfx on|off');
        keepOpen = true;
      }
      break;
    }
    case 'color': {
      const parts = arg.split(/\s+/).filter(Boolean);
      const mode = (parts[0] || '').toLowerCase();
      if (mode === 'theme') {
        const name = parts.slice(1).join(' ');
        const idx = resolveThemeIndex(name);
        if (idx !== -1) applyTheme(idx, true);
        else {
          toast(`Theme not found: ${name || '(empty)'}`);
          keepOpen = true;
        }
        break;
      }
      if (mode === 'hex') {
        const hex = parts[1];
        if (!looksLikeHex(hex)) {
          toast('Usage: color hex <#rrggbb>');
          keepOpen = true;
          break;
        }
        applyCustomTheme(hex);
        toast('Custom theme applied');
        break;
      }
      if (looksLikeHex(arg)) {
        applyCustomTheme(arg);
        toast('Custom theme applied');
        break;
      }
      const idx = resolveThemeIndex(arg);
      if (idx !== -1) {
        applyTheme(idx, true);
        break;
      }
      toast('Usage: color theme <name> | color hex <#rrggbb>');
      keepOpen = true;
      break;
    }
    case 'filter': {
      const tokens = arg.split(/\s+/).filter(Boolean);
      const scope = (tokens[0] || '').toLowerCase();
      const rest = tokens.slice(1).join(' ').trim();
      if (!scope) {
        toast('Usage: filter blog|projects|resources ...');
        keepOpen = true;
        break;
      }
      if (scope === 'blog') {
        const tag = rest || 'all';
        filterBlog(tag);
        nav('blog');
        break;
      }
      if (scope === 'projects') {
        const type = (tokens[1] || '').toLowerCase();
        const value = tokens.slice(2).join(' ').trim();
        if (type === 'category') {
          setProjCat(value || 'All');
          nav('projects');
          break;
        }
        if (type === 'focus') {
          const focusMap = typeof PROJECT_FOCUS_MAP !== 'undefined' ? PROJECT_FOCUS_MAP : {};
          const cats = Object.keys(focusMap);
          let foundCat = null;
          cats.some(c => {
            const arr = focusMap[c] || [];
            if (arr.some(f => String(f).toLowerCase() === value.toLowerCase())) {
              foundCat = c;
              return true;
            }
            return false;
          });
          if (foundCat && PROJ_CAT_FILTER !== foundCat) setProjCat(foundCat);
          setProjFocus(value || 'All');
          nav('projects');
          break;
        }
        toast('Usage: filter projects category <name> | filter projects focus <name>');
        keepOpen = true;
        break;
      }
      if (scope === 'resources') {
        const type = (tokens[1] || '').toLowerCase();
        const value = tokens.slice(2).join(' ').trim();
        if (type === 'type') {
          setResType(value || 'All');
          nav('resources');
          break;
        }
        toast('Usage: filter resources type <name>');
        keepOpen = true;
        break;
      }
      toast('Usage: filter blog|projects|resources ...');
      keepOpen = true;
      break;
    }
    case 'reading': {
      const mode = arg.toLowerCase();
      if (mode === 'toggle') toggleReadingMode();
      else if (mode === 'on') setReadingMode(true);
      else if (mode === 'off') setReadingMode(false);
      else {
        toast('Usage: reading on|off|toggle');
        keepOpen = true;
      }
      break;
    }
    case 'favorites': {
      const tokens = arg.split(/\s+/).filter(Boolean);
      const scope = (tokens[0] || '').toLowerCase();
      const action = (tokens[1] || '').toLowerCase();
      if (scope !== 'tools') {
        toast('Usage: favorites tools <show|hide|toggle>');
        keepOpen = true;
        break;
      }
      if (action === 'show') window.setToolsFavFilter?.(true);
      else if (action === 'hide') window.setToolsFavFilter?.(false);
      else if (action === 'toggle') window.toggleToolsFavFilter?.();
      else {
        toast('Usage: favorites tools <show|hide|toggle>');
        keepOpen = true;
      }
      break;
    }
    default:
      toast(`Unknown command: ${cmdToken}`);
      keepOpen = true;
  }

  pushHistory(clean);
  if (!keepOpen) closeSearch({ target: document.getElementById('search-modal') });
}

/* --- Keyboard navigation ---------------------------------------- */
function focusSearchItem(idx) {
  SEARCH_FOCUS_IDX = idx;
  document.querySelectorAll('.s-item').forEach((el, i) => {
    el.classList.toggle('focus', i === idx);
  });
}

function moveFocus(dir) {
  const total = SEARCH_ALL_ITEMS.length;
  if (!total) return;
  SEARCH_FOCUS_IDX = (SEARCH_FOCUS_IDX + dir + total) % total;
  focusSearchItem(SEARCH_FOCUS_IDX);
  const focused = document.querySelector(`.s-item[data-idx="${SEARCH_FOCUS_IDX}"]`);
  if (focused) focused.scrollIntoView({ block: 'nearest' });
}

function activateFocused() {
  if (SEARCH_FOCUS_IDX < 0 || !SEARCH_ALL_ITEMS[SEARCH_FOCUS_IDX]) return false;
  const item = SEARCH_ALL_ITEMS[SEARCH_FOCUS_IDX];
  try { (new Function(item.act))(); } catch (e) { eval(item.act); }
  return true;
}

function stepHistory(delta) {
  if (!TERMINAL_HISTORY.length) return;
  if (HISTORY_IDX === -1) HISTORY_IDX = 0;
  HISTORY_IDX = Math.max(0, Math.min(TERMINAL_HISTORY.length - 1, HISTORY_IDX + delta));
  const value = TERMINAL_HISTORY[HISTORY_IDX] || '';
  const inp = document.getElementById('search-input');
  if (inp) {
    inp.value = value;
    inp.dispatchEvent(new Event('input'));
  }
}

/* --- Input handler ---------------------------------------------- */
document.getElementById('search-input').addEventListener('input', function () {
  const val = this.value;
  SEARCH_FOCUS_IDX = -1;
  HISTORY_IDX = -1;

  if (!val.trim()) {
    document.getElementById('search-results').innerHTML = buildEmptyState();
    return;
  }

  SEARCH_CMD_SUGGESTIONS = collectCommandSuggestions(val);
  if (!SEARCH_CMD_SUGGESTIONS.length) {
    SEARCH_CMD_SUGGESTIONS = [makeRunSuggestion('help', 'Show all commands', 'HELP')];
  }
  const groups = { Commands: SEARCH_CMD_SUGGESTIONS };
  const token = String(val || '').trim().split(/\s+/)[0] || '';
  const tokenNorm = normalizeCommandToken(token.toLowerCase());
  const toolSuggestions = collectToolSuggestions(val);
  if (toolSuggestions.length) {
    if (tokenNorm === 'tool' || tokenNorm === 'tools') {
      const ordered = { Tools: toolSuggestions, Commands: SEARCH_CMD_SUGGESTIONS };
      document.getElementById('search-results').innerHTML = renderGroups(ordered);
      return;
    }
    groups.Tools = toolSuggestions;
  }
  document.getElementById('search-results').innerHTML = renderGroups(groups);
});

/* --- Keyboard shortcuts ----------------------------------------- */
document.addEventListener('keydown', e => {
  const key = (e.key || '').toLowerCase();

  if ((e.ctrlKey || e.metaKey) && key === 'k') {
    e.preventDefault();
    openSearch();
    return;
  }

  const isOpen = document.getElementById('search-modal').classList.contains('open');
  if (!isOpen) return;

  if (key === 'escape') {
    closeSearch({ target: document.getElementById('search-modal') });
    return;
  }

  const input = document.getElementById('search-input');
  const isInput = document.activeElement === input;

  if (isInput && e.altKey && key === 'arrowup') { e.preventDefault(); stepHistory(1); return; }
  if (isInput && e.altKey && key === 'arrowdown') { e.preventDefault(); stepHistory(-1); return; }

  if (key === 'arrowdown') { e.preventDefault(); moveFocus(1); return; }
  if (key === 'arrowup') { e.preventDefault(); moveFocus(-1); return; }

  if (key === 'enter') {
    const val = input.value;
    if (SEARCH_CMD_SUGGESTIONS.length) {
      if (SEARCH_FOCUS_IDX !== -1) activateFocused();
      else executeCommand(val);
      return;
    }
    executeCommand(val);
  }

  if (key === 'tab') {
    if (!SEARCH_ALL_ITEMS.length) return;
    e.preventDefault();
    const next = getAutocompleteValue();
    if (next) fillSearchInput(next + ' ');
  }

  if (key === 'arrowright' && isInput) {
    if (!SEARCH_ALL_ITEMS.length) return;
    const caretAtEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
    if (!caretAtEnd) return;
    e.preventDefault();
    const next = getAutocompleteValue();
    if (next) fillSearchInput(next + ' ');
  }
});

window.openTerminal = openTerminal;
window.closeTerminal = closeTerminal;
window.openSearch = openSearch;
window.closeSearch = closeSearch;
