/* ================================================================
   SEARCH.JS - Hybrid terminal shell
================================================================ */

const TERMINAL_HISTORY_KEY = 'terminal_history';
const LEGACY_HISTORY_KEY = 'search_history';
const TERMINAL_PROMPT_FALLBACK = 'nomu@site:~$';
const TERMINAL_MAX_HISTORY = 12;
const TERMINAL_ACTIONS = new Map();

const TERMINAL_STATE = {
  transcript: [],
  history: loadTerminalHistory(),
  historyCursor: -1,
  historyDraft: '',
  buffer: '',
  completions: [],
  completionIndex: -1,
  completionCycle: null,
  booted: false,
  scrollPending: false,
};

const COMMANDS = [
  { cmd: 'help', args: '', desc: 'Show all commands', aliases: ['?'] },
  { cmd: 'search', args: '<query>', desc: 'Search site content', aliases: ['find'] },
  { cmd: 'open', args: '<url|page|name>', desc: 'Open a page, post, project, resource, tool, or URL', aliases: ['o'] },
  { cmd: 'ls', args: '[tools|posts|projects|resources]', desc: 'List available items', aliases: ['list'] },
  { cmd: 'history', args: '', desc: 'Show recent commands', aliases: [] },
  { cmd: 'clear', args: '', desc: 'Clear the transcript', aliases: ['cls'] },
  { cmd: 'volume', args: '<0-100>', desc: 'Set music volume', aliases: ['vol'] },
  { cmd: 'song', args: '<next|prev|play|pause|toggle|name>', desc: 'Control music playback', aliases: ['music', 'track'] },
  { cmd: 'sfx', args: 'on|off|1|0', desc: 'Toggle sound effects', aliases: ['sound'] },
  { cmd: 'color', args: 'theme <name> | hex <#rrggbb>', desc: 'Set accent color', aliases: ['theme', 'accent'] },
  { cmd: 'filter', args: 'blog|projects|resources ...', desc: 'Apply view filters', aliases: ['filters'] },
  { cmd: 'favorites', args: 'tools <show|hide|toggle>', desc: 'Tools favorites filter', aliases: ['fav'] },
  { cmd: 'whoami', args: '', desc: 'Show current user/site info', aliases: [] },
  { cmd: 'time', args: '', desc: 'Show current local time', aliases: ['date'] },
  { cmd: 'echo', args: '<text>', desc: 'Echo text back into the transcript', aliases: [] },
  { cmd: 'ping', args: '', desc: 'Ping the app', aliases: [] },
];

const COMMAND_NAV_VIEWS = ['home', 'blog', 'projects', 'resources', 'tools', 'about'];
const SONG_ACTIONS = ['next', 'prev', 'previous', 'skip', 'play', 'pause', 'toggle'];
const LS_SCOPES = ['tools', 'posts', 'projects', 'resources'];

const COMMAND_INDEX = new Map();
COMMANDS.forEach(command => {
  COMMAND_INDEX.set(command.cmd, command.cmd);
  (command.aliases || []).forEach(alias => COMMAND_INDEX.set(alias, command.cmd));
});

const TERMINAL_DOM = {
  modal: document.getElementById('search-modal'),
  transcript: document.getElementById('search-transcript'),
  input: document.getElementById('search-input'),
  ghost: document.getElementById('search-ghost'),
  completions: document.getElementById('search-completions'),
  promptRow: document.getElementById('search-prompt-row'),
  promptLabel: document.getElementById('search-prompt-label'),
};

function escHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPromptLabel() {
  const author = (typeof DB !== 'undefined' && DB.site && DB.site.author) ? DB.site.author : 'nomu';
  return `${String(author).toLowerCase()}@site:~$`;
}

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
  localStorage.setItem(TERMINAL_HISTORY_KEY, JSON.stringify(TERMINAL_STATE.history));
}

function pushHistory(cmdLine) {
  const cleaned = String(cmdLine || '').trim();
  if (!cleaned) return;
  TERMINAL_STATE.history = [cleaned, ...TERMINAL_STATE.history.filter(item => item !== cleaned)].slice(0, TERMINAL_MAX_HISTORY);
  saveTerminalHistory();
}

function getDbList(key) {
  return (typeof DB !== 'undefined' && Array.isArray(DB[key])) ? DB[key] : [];
}

function getThemeList() {
  return (typeof THEMES !== 'undefined' && Array.isArray(THEMES)) ? THEMES : [];
}

function isCaretAtEnd() {
  if (!TERMINAL_DOM.input) return true;
  return TERMINAL_DOM.input.selectionStart === TERMINAL_DOM.input.value.length
    && TERMINAL_DOM.input.selectionEnd === TERMINAL_DOM.input.value.length;
}

function setCaret(pos) {
  if (!TERMINAL_DOM.input) return;
  const next = Math.max(0, Math.min(TERMINAL_DOM.input.value.length, pos));
  TERMINAL_DOM.input.focus();
  TERMINAL_DOM.input.setSelectionRange(next, next);
}

function focusInputAtEnd() {
  if (!TERMINAL_DOM.input) return;
  TERMINAL_DOM.input.focus();
  const end = TERMINAL_DOM.input.value.length;
  TERMINAL_DOM.input.setSelectionRange(end, end);
}

function normalizeCommandToken(token) {
  return COMMAND_INDEX.get(token) || token;
}

function findCommand(token) {
  const normalized = normalizeCommandToken(String(token || '').toLowerCase());
  return COMMANDS.find(command => command.cmd === normalized) || null;
}

function rankMatches(items, getter, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return items.slice();
  const exact = [];
  const starts = [];
  const contains = [];
  items.forEach(item => {
    const hay = String(getter(item) || '').toLowerCase();
    if (!hay) return;
    if (hay === needle) exact.push(item);
    else if (hay.startsWith(needle)) starts.push(item);
    else if (hay.includes(needle)) contains.push(item);
  });
  return [...exact, ...starts, ...contains];
}

function findBestMatch(list, query, fields) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return null;
  const fieldValue = (item, field) => String(item[field] || '').toLowerCase();
  const exact = list.find(item => fields.some(field => fieldValue(item, field) === needle));
  if (exact) return exact;
  const starts = list.find(item => fields.some(field => fieldValue(item, field).startsWith(needle)));
  if (starts) return starts;
  return list.find(item => fields.some(field => fieldValue(item, field).includes(needle))) || null;
}

function findExactFieldMatch(list, query, fields) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return null;
  return list.find(item => fields.some(field => String(item[field] || '').trim().toLowerCase() === needle)) || null;
}

function looksLikeHex(value) {
  return /^#?[0-9a-fA-F]{6}$/.test(String(value || '').trim());
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
  const root = document.documentElement;
  root.style.setProperty('--ah', hsl.h);
  root.style.setProperty('--as', `${hsl.s}%`);
  root.style.setProperty('--al', `${hsl.l}%`);
  root.style.setProperty('--accent', `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`);
  root.style.setProperty('--accent-dim', `hsl(${hsl.h},${hsl.s}%,32%)`);
  root.style.setProperty('--accent-glow', `hsl(${hsl.h},${hsl.s}%,${hsl.l}%,0.2)`);
  root.style.setProperty('--accent-glow2', `hsl(${hsl.h},${hsl.s}%,${hsl.l}%,0.07)`);
  root.style.setProperty('--accent-subtle', `hsl(${hsl.h},50%,9%)`);
  root.style.setProperty('--border-a', `hsl(${hsl.h},${hsl.s}%,${hsl.l}%,0.26)`);
  document.querySelectorAll('.swatch').forEach(swatch => swatch.classList.remove('active'));
  localStorage.setItem('themeIdx', '-1');
  localStorage.setItem('theme_custom', color);
}

function resolveThemeIndex(query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return -1;
  const themes = getThemeList();
  let idx = themes.findIndex(theme => String(theme.name || '').toLowerCase() === needle);
  if (idx !== -1) return idx;
  idx = themes.findIndex(theme => String(theme.name || '').toLowerCase().startsWith(needle));
  if (idx !== -1) return idx;
  return themes.findIndex(theme => String(theme.name || '').toLowerCase().includes(needle));
}

function normalizeExternalUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  return '';
}

function setSfxEnabledSilent(enabled) {
  SFX_ENABLED = !!enabled;
  if (typeof window.__setSynthSfxEnabled === 'function') window.__setSynthSfxEnabled(SFX_ENABLED);
  else localStorage.setItem('sfx_enabled', JSON.stringify(SFX_ENABLED));
  document.getElementById('sfx-toggle-btn')?.classList.toggle('active', SFX_ENABLED);
}

function formatLocalTime(now = new Date()) {
  const pad = value => String(value).padStart(2, '0');
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const offsetAbs = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(offsetAbs / 60);
  const offsetMins = offsetAbs % 60;
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} UTC${sign}${pad(offsetHours)}:${pad(offsetMins)}`;
}

function makeCompletion({ insertText, label, meta, badge = 'CMD', replaceStart, replaceEnd, appendSpace = true }) {
  return { insertText, label, meta, badge, replaceStart, replaceEnd, appendSpace };
}

function commandEntry(text) {
  return { kind: 'command', text };
}

function lineEntry(text, tone = 'default', tag = 'OUT') {
  return { kind: 'line', text, tone, tag };
}

function listEntry(title, items, tone = 'default') {
  return { kind: 'list', title, items, tone };
}

function registerAction(action) {
  const id = `terminal-action-${TERMINAL_ACTIONS.size + 1}`;
  TERMINAL_ACTIONS.set(id, action);
  return id;
}

function applyCompletionCandidate(candidate, appendSpace = candidate.appendSpace) {
  const nextValue = `${TERMINAL_STATE.buffer.slice(0, candidate.replaceStart)}${candidate.insertText}${TERMINAL_STATE.buffer.slice(candidate.replaceEnd)}`;
  return appendSpace && !/\s$/.test(nextValue) ? `${nextValue} ` : nextValue;
}

function longestCommonPrefix(values) {
  if (!values.length) return '';
  const lower = values.map(value => String(value || '').toLowerCase());
  let idx = 0;
  while (idx < lower[0].length && lower.every(value => value[idx] === lower[0][idx])) idx += 1;
  return String(values[0] || '').slice(0, idx);
}

function buildCommandCandidates(query, replaceStart, replaceEnd) {
  const needle = String(query || '').trim().toLowerCase();
  return COMMANDS
    .filter(command => {
      if (!needle) return true;
      if (command.cmd.startsWith(needle)) return true;
      return (command.aliases || []).some(alias => alias.startsWith(needle));
    })
    .map(command => {
      const aliasText = (command.aliases || []).length ? `Aliases: ${(command.aliases || []).join(', ')}` : 'No aliases';
      return makeCompletion({
        insertText: command.cmd,
        label: command.cmd,
        meta: `${command.desc}${command.args ? ` (${command.args})` : ''} · ${aliasText}`,
        badge: 'CMD',
        replaceStart,
        replaceEnd,
      });
    });
}

function buildNameCandidates(raw, replaceStart, items, getName, metaBuilder, badge, limit = 8) {
  const query = raw.trim();
  return rankMatches(items, getName, query)
    .slice(0, limit)
    .map(item => makeCompletion({
      insertText: getName(item),
      label: getName(item),
      meta: metaBuilder(item),
      badge,
      replaceStart,
      replaceEnd: TERMINAL_STATE.buffer.length,
    }));
}

function buildSearchQueryCandidates(argRaw, replaceStart) {
  const query = String(argRaw || '').trim().toLowerCase();
  if (!query) return [];
  const pool = [
    ...getDbList('posts').map(item => ({ label: item.title, meta: item.excerpt || item.description || 'Blog post', badge: 'POST' })),
    ...getDbList('projects').map(item => ({ label: item.name, meta: item.desc || 'Project', badge: 'PROJ' })),
    ...getDbList('resources').map(item => ({ label: item.title, meta: item.desc || 'Resource', badge: 'RES' })),
    ...getDbList('tools').map(item => ({ label: item.name, meta: item.desc || 'Tool', badge: 'TOOL' })),
  ];
  return rankMatches(pool, item => item.label, query)
    .slice(0, 8)
    .map(item => makeCompletion({
      insertText: item.label,
      label: item.label,
      meta: item.meta,
      badge: item.badge,
      replaceStart,
      replaceEnd: TERMINAL_STATE.buffer.length,
    }));
}

function buildOpenCandidates(argRaw, replaceStart) {
  const query = String(argRaw || '').trim().toLowerCase();
  const pool = [
    ...COMMAND_NAV_VIEWS.map(item => ({ label: item, meta: `Go to ${item}`, badge: 'NAV' })),
    ...getDbList('posts').map(item => ({ label: item.title, meta: item.excerpt || item.description || 'Blog post', badge: 'POST' })),
    ...getDbList('projects').map(item => ({ label: item.name, meta: item.desc || 'Project', badge: 'PROJ' })),
    ...getDbList('resources').map(item => ({ label: item.title, meta: item.desc || 'Resource', badge: 'RES' })),
    ...getDbList('tools').map(item => ({ label: item.name, meta: item.desc || 'Tool', badge: 'TOOL' })),
  ];

  return rankMatches(pool, item => item.label, query)
    .slice(0, 8)
    .map(item => makeCompletion({
      insertText: item.label,
      label: item.label,
      meta: item.meta,
      badge: item.badge,
      replaceStart,
      replaceEnd: TERMINAL_STATE.buffer.length,
    }));
}

function buildColorCandidates(argRaw, commandSpan) {
  const tokens = argRaw.trim().split(/\s+/).filter(Boolean);
  const hasTrailing = /\s$/.test(argRaw);
  const bufferLength = TERMINAL_STATE.buffer.length;

  if (!tokens.length) {
    return [
      makeCompletion({ insertText: 'theme', label: 'theme', meta: 'Pick a saved theme', badge: 'MODE', replaceStart: commandSpan, replaceEnd: bufferLength }),
      makeCompletion({ insertText: 'hex', label: 'hex', meta: 'Use a custom hex color', badge: 'MODE', replaceStart: commandSpan, replaceEnd: bufferLength }),
    ];
  }

  if (tokens.length === 1 && !hasTrailing) {
    return ['theme', 'hex']
      .filter(mode => mode.startsWith(tokens[0].toLowerCase()))
      .map(mode => makeCompletion({
        insertText: mode,
        label: mode,
        meta: mode === 'theme' ? 'Pick a saved theme' : 'Use a custom hex color',
        badge: 'MODE',
        replaceStart: commandSpan,
        replaceEnd: bufferLength,
      }));
  }

  const mode = tokens[0].toLowerCase();
  if (mode === 'theme') {
    const replaceStart = (/^\s*\S+\s+theme\s*/i.exec(TERMINAL_STATE.buffer) || [''])[0].length;
    const prefix = argRaw.replace(/^theme\b\s*/i, '');
    return rankMatches(getThemeList(), theme => theme.name, prefix)
      .map(theme => makeCompletion({
        insertText: theme.name,
        label: theme.name,
        meta: `Accent ${theme.c || ''}`.trim(),
        badge: 'THEME',
        replaceStart,
        replaceEnd: bufferLength,
      }));
  }

  if (mode === 'hex') {
    const replaceStart = (/^\s*\S+\s+hex\s*/i.exec(TERMINAL_STATE.buffer) || [''])[0].length;
    return ['#00d4b4', '#9f6ef7', '#22c55e']
      .filter(value => value.toLowerCase().startsWith(argRaw.replace(/^hex\b\s*/i, '').toLowerCase()))
      .map(value => makeCompletion({
        insertText: value,
        label: value,
        meta: 'Custom accent color',
        badge: 'HEX',
        replaceStart,
        replaceEnd: bufferLength,
      }));
  }

  return [];
}

function buildFilterCandidates(argRaw, commandSpan) {
  const tokens = argRaw.trim().split(/\s+/).filter(Boolean);
  const hasTrailing = /\s$/.test(argRaw);
  const bufferLength = TERMINAL_STATE.buffer.length;

  if (!tokens.length) {
    return ['blog', 'projects', 'resources'].map(scope => makeCompletion({
      insertText: scope,
      label: scope,
      meta: `Filter ${scope}`,
      badge: 'SCOPE',
      replaceStart: commandSpan,
      replaceEnd: bufferLength,
    }));
  }

  if (tokens.length === 1 && !hasTrailing) {
    return ['blog', 'projects', 'resources']
      .filter(scope => scope.startsWith(tokens[0].toLowerCase()))
      .map(scope => makeCompletion({
        insertText: scope,
        label: scope,
        meta: `Filter ${scope}`,
        badge: 'SCOPE',
        replaceStart: commandSpan,
        replaceEnd: bufferLength,
      }));
  }

  const scope = tokens[0].toLowerCase();
  if (scope === 'blog') {
    const replaceStart = (/^\s*\S+\s+blog\s*/i.exec(TERMINAL_STATE.buffer) || [''])[0].length;
    const prefix = argRaw.replace(/^blog\b\s*/i, '');
    return rankMatches(['all', ...getAllTags()], tag => tag, prefix)
      .slice(0, 8)
      .map(tag => makeCompletion({
        insertText: tag,
        label: tag,
        meta: 'Blog tag',
        badge: 'TAG',
        replaceStart,
        replaceEnd: bufferLength,
      }));
  }

  if (scope === 'projects') {
    if ((tokens.length === 1 && hasTrailing) || (tokens.length === 2 && !hasTrailing)) {
      const replaceStart = (/^\s*\S+\s+projects\s*/i.exec(TERMINAL_STATE.buffer) || [''])[0].length;
      const prefix = tokens.length === 2 && !hasTrailing ? tokens[1] : '';
      return ['category', 'focus']
        .filter(mode => mode.startsWith(prefix.toLowerCase()))
        .map(mode => makeCompletion({
          insertText: mode,
          label: mode,
          meta: `Projects ${mode}`,
          badge: 'MODE',
          replaceStart,
          replaceEnd: bufferLength,
        }));
    }

    const mode = String(tokens[1] || '').toLowerCase();
    if (mode === 'category') {
      const replaceStart = (/^\s*\S+\s+projects\s+category\s*/i.exec(TERMINAL_STATE.buffer) || [''])[0].length;
      const prefix = argRaw.replace(/^projects\s+category\b\s*/i, '');
      const categories = typeof PROJECT_CATEGORIES !== 'undefined' ? PROJECT_CATEGORIES.filter(cat => cat !== 'All') : [];
      return rankMatches(categories, value => value, prefix).map(value => makeCompletion({
        insertText: value,
        label: value,
        meta: 'Project category',
        badge: 'CAT',
        replaceStart,
        replaceEnd: bufferLength,
      }));
    }

    if (mode === 'focus') {
      const replaceStart = (/^\s*\S+\s+projects\s+focus\s*/i.exec(TERMINAL_STATE.buffer) || [''])[0].length;
      const prefix = argRaw.replace(/^projects\s+focus\b\s*/i, '');
      const focusMap = typeof PROJECT_FOCUS_MAP !== 'undefined' ? PROJECT_FOCUS_MAP : {};
      const allFocus = [...new Set(Object.values(focusMap).flat().filter(Boolean).filter(item => item !== 'All'))];
      return rankMatches(allFocus, value => value, prefix).map(value => makeCompletion({
        insertText: value,
        label: value,
        meta: 'Project focus',
        badge: 'FOCUS',
        replaceStart,
        replaceEnd: bufferLength,
      }));
    }
  }

  if (scope === 'resources') {
    if ((tokens.length === 1 && hasTrailing) || (tokens.length === 2 && !hasTrailing)) {
      const replaceStart = (/^\s*\S+\s+resources\s*/i.exec(TERMINAL_STATE.buffer) || [''])[0].length;
      const prefix = tokens.length === 2 && !hasTrailing ? tokens[1] : '';
      return ['type']
        .filter(mode => mode.startsWith(prefix.toLowerCase()))
        .map(mode => makeCompletion({
          insertText: mode,
          label: mode,
          meta: 'Resource type',
          badge: 'MODE',
          replaceStart,
          replaceEnd: bufferLength,
        }));
    }

    if (String(tokens[1] || '').toLowerCase() === 'type') {
      const replaceStart = (/^\s*\S+\s+resources\s+type\s*/i.exec(TERMINAL_STATE.buffer) || [''])[0].length;
      const prefix = argRaw.replace(/^resources\s+type\b\s*/i, '');
      const types = typeof RESOURCE_TYPES !== 'undefined' ? RESOURCE_TYPES.filter(type => type !== 'All') : [];
      return rankMatches(types, value => value, prefix).map(value => makeCompletion({
        insertText: value,
        label: value,
        meta: 'Resource type',
        badge: 'TYPE',
        replaceStart,
        replaceEnd: bufferLength,
      }));
    }
  }

  return [];
}

function buildFavoritesCandidates(argRaw, commandSpan) {
  const tokens = argRaw.trim().split(/\s+/).filter(Boolean);
  const hasTrailing = /\s$/.test(argRaw);
  const bufferLength = TERMINAL_STATE.buffer.length;

  if (!tokens.length) {
    return [
      makeCompletion({
        insertText: 'tools',
        label: 'tools',
        meta: 'Filter the tools rail favorites view',
        badge: 'SCOPE',
        replaceStart: commandSpan,
        replaceEnd: bufferLength,
      }),
    ];
  }

  if (tokens.length === 1 && !hasTrailing) {
    return ['tools']
      .filter(scope => scope.startsWith(tokens[0].toLowerCase()))
      .map(scope => makeCompletion({
        insertText: scope,
        label: scope,
        meta: 'Filter the tools rail favorites view',
        badge: 'SCOPE',
        replaceStart: commandSpan,
        replaceEnd: bufferLength,
      }));
  }

  if (String(tokens[0] || '').toLowerCase() === 'tools') {
    const replaceStart = (/^\s*\S+\s+tools\s*/i.exec(TERMINAL_STATE.buffer) || [''])[0].length;
    const prefix = argRaw.replace(/^tools\b\s*/i, '');
    return ['show', 'hide', 'toggle']
      .filter(action => action.startsWith(prefix.toLowerCase()))
      .map(action => makeCompletion({
        insertText: action,
        label: action,
        meta: `Favorites ${action}`,
        badge: 'FAV',
        replaceStart,
        replaceEnd: bufferLength,
      }));
  }

  return [];
}

function buildSongCandidates(argRaw, commandSpan) {
  const replaceStart = commandSpan;
  const bufferLength = TERMINAL_STATE.buffer.length;
  const prefix = String(argRaw || '').trim();
  const actionCandidates = rankMatches(SONG_ACTIONS, value => value, prefix).map(value => makeCompletion({
    insertText: value,
    label: value,
    meta: `Music ${value}`,
    badge: 'MUSIC',
    replaceStart,
    replaceEnd: bufferLength,
  }));
  const trackCandidates = rankMatches(getDbList('music'), item => item.title, prefix)
    .slice(0, 6)
    .map(item => makeCompletion({
      insertText: item.title,
      label: item.title,
      meta: item.artist || 'Track',
      badge: 'TRACK',
      replaceStart,
      replaceEnd: bufferLength,
    }));
  return [...actionCandidates, ...trackCandidates];
}

function buildArgumentCompletions(commandName, argRaw, commandSpan) {
  const bufferLength = TERMINAL_STATE.buffer.length;
  switch (commandName) {
    case 'search':
      return buildSearchQueryCandidates(argRaw, commandSpan);
    case 'open':
      return buildOpenCandidates(argRaw, commandSpan);
    case 'volume':
      return [0, 25, 50, 75, 100]
        .filter(value => String(value).startsWith(String(argRaw || '').trim()))
        .map(value => makeCompletion({
          insertText: String(value),
          label: String(value),
          meta: `Set volume to ${value}%`,
          badge: 'VOL',
          replaceStart: commandSpan,
          replaceEnd: bufferLength,
        }));
    case 'song':
      return buildSongCandidates(argRaw, commandSpan);
    case 'sfx':
      return ['on', 'off', '1', '0']
        .filter(value => value.startsWith(String(argRaw || '').trim().toLowerCase()))
        .map(value => makeCompletion({
          insertText: value,
          label: value,
          meta: `Sound effects ${value}`,
          badge: 'SFX',
          replaceStart: commandSpan,
          replaceEnd: bufferLength,
        }));
    case 'color':
      return buildColorCandidates(argRaw, commandSpan);
    case 'filter':
      return buildFilterCandidates(argRaw, commandSpan);
    case 'favorites':
      return buildFavoritesCandidates(argRaw, commandSpan);
    case 'ls':
      return LS_SCOPES
        .filter(value => value.startsWith(String(argRaw || '').trim().toLowerCase()))
        .map(value => makeCompletion({
          insertText: value,
          label: value,
          meta: `List ${value}`,
          badge: 'LS',
          replaceStart: commandSpan,
          replaceEnd: bufferLength,
        }));
    default:
      return [];
  }
}

function buildCompletions(value) {
  const raw = String(value || '');
  const trimmed = raw.trim();
  const leadingSpaces = (raw.match(/^\s*/) || [''])[0].length;
  if (!trimmed) {
    return buildCommandCandidates('', leadingSpaces, raw.length);
  }

  const hasTrailing = /\s$/.test(raw);
  if (!hasTrailing && !/\s/.test(trimmed)) {
    return buildCommandCandidates(trimmed, leadingSpaces, raw.length);
  }

  const firstTokenMatch = raw.trimStart().match(/^\S+/);
  const firstToken = firstTokenMatch ? firstTokenMatch[0] : '';
  const command = findCommand(firstToken);
  if (!command) return [];

  const commandSpan = (/^\s*\S+\s*/.exec(raw) || [''])[0].length;
  const argRaw = raw.slice(commandSpan);
  return buildArgumentCompletions(command.cmd, argRaw, commandSpan);
}

function updateCompletionState() {
  if (TERMINAL_STATE.completionCycle) {
    TERMINAL_STATE.completions = TERMINAL_STATE.completionCycle.candidates;
    TERMINAL_STATE.completionIndex = TERMINAL_STATE.completionCycle.index;
    return;
  }

  if (!isCaretAtEnd()) {
    TERMINAL_STATE.completions = [];
    TERMINAL_STATE.completionIndex = -1;
    return;
  }

  TERMINAL_STATE.completions = buildCompletions(TERMINAL_STATE.buffer);
  TERMINAL_STATE.completionIndex = TERMINAL_STATE.completions.length ? 0 : -1;
}

function clearCompletionCycle() {
  TERMINAL_STATE.completionCycle = null;
}

function setBuffer(value, options = {}) {
  TERMINAL_STATE.buffer = String(value ?? '');
  if (TERMINAL_DOM.input && TERMINAL_DOM.input.value !== TERMINAL_STATE.buffer) {
    TERMINAL_DOM.input.value = TERMINAL_STATE.buffer;
  }

  if (!options.preserveHistory) {
    TERMINAL_STATE.historyCursor = -1;
    TERMINAL_STATE.historyDraft = TERMINAL_STATE.buffer;
  }

  if (!options.keepCycle) clearCompletionCycle();
  updateCompletionState();
  renderTerminal();

  if (options.focus !== false) focusInputAtEnd();
  if (options.caret === 'start') setCaret(0);
}

function ensureTerminalBoot() {
  if (TERMINAL_STATE.booted) return;
  TERMINAL_STATE.booted = true;
  TERMINAL_STATE.transcript.push(
    lineEntry('Terminal subsystem online', 'dim', 'SYS'),
    lineEntry('Type "help" to list commands', 'accent', 'RDY')
  );
  if (TERMINAL_STATE.history.length) {
    TERMINAL_STATE.transcript.push(
      lineEntry(`Loaded ${TERMINAL_STATE.history.length} saved command${TERMINAL_STATE.history.length !== 1 ? 's' : ''}`, 'dim', 'HIS')
    );
  }
  TERMINAL_STATE.scrollPending = true;
}

function parseCommandLine(input) {
  const raw = String(input || '').trim();
  const clean = raw.startsWith('>') ? raw.slice(1).trim() : raw;
  if (!clean) return null;
  const firstSpace = clean.search(/\s/);
  const token = firstSpace === -1 ? clean : clean.slice(0, firstSpace);
  const argRaw = firstSpace === -1 ? '' : clean.slice(firstSpace + 1);
  return {
    clean,
    token,
    cmdToken: normalizeCommandToken(token.toLowerCase()),
    argRaw,
    arg: argRaw.trim(),
  };
}

function openExternalUrl(url) {
  if (typeof openUrl === 'function') openUrl(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}

function buildHelpEntries() {
  const entries = [lineEntry(`${COMMANDS.length} commands available`, 'accent', 'MAN')];
  COMMANDS.forEach(command => {
    const usage = `${command.cmd}${command.args ? ` ${command.args}` : ''}`;
    const aliasText = (command.aliases || []).length ? ` | aliases: ${(command.aliases || []).join(', ')}` : '';
    entries.push(lineEntry(`${usage} :: ${command.desc}${aliasText}`, 'default', 'CMD'));
  });
  return entries;
}

function buildHistoryEntries() {
  if (!TERMINAL_STATE.history.length) {
    return [lineEntry('No commands in history yet', 'dim', 'HIS')];
  }

  return [
    lineEntry(`Showing ${TERMINAL_STATE.history.length} recent command${TERMINAL_STATE.history.length !== 1 ? 's' : ''}`, 'accent', 'HIS'),
    listEntry('History', TERMINAL_STATE.history.map((item, idx) => ({
      title: item,
      meta: `#${idx + 1}`,
      badge: 'HIS',
      action: { kind: 'fill', value: item },
    }))),
  ];
}

function buildSearchEntries(query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return [lineEntry('Usage: search <query>', 'error', 'ERR')];

  const exactPost = findExactFieldMatch(getDbList('posts'), query, ['id', 'title']);
  if (exactPost) {
    nav('article', exactPost.id);
    return [lineEntry(`Opened post ${exactPost.title}`, 'accent', 'POST')];
  }

  const exactProject = findExactFieldMatch(getDbList('projects'), query, ['id', 'name']);
  if (exactProject) {
    nav('project', exactProject.id);
    return [lineEntry(`Opened project ${exactProject.name}`, 'accent', 'PROJ')];
  }

  const posts = rankMatches(getDbList('posts'), item => `${item.title} ${item.excerpt || item.description || ''} ${(item.tags || []).join(' ')}`, needle)
    .slice(0, 8)
    .map(item => ({
      title: item.title,
      meta: item.excerpt || item.description || 'Blog post',
      badge: 'POST',
      action: { kind: 'run', command: `open ${item.title}` },
    }));

  const projects = rankMatches(getDbList('projects'), item => `${item.name} ${item.desc || ''} ${item.category || ''}`, needle)
    .slice(0, 8)
    .map(item => ({
      title: item.name,
      meta: item.desc || 'Project',
      badge: 'PROJ',
      action: { kind: 'run', command: `open ${item.name}` },
    }));

  const resources = rankMatches(getDbList('resources'), item => `${item.title} ${item.desc || ''} ${item.type || ''}`, needle)
    .slice(0, 8)
    .map(item => ({
      title: item.title,
      meta: item.desc || 'Resource',
      badge: 'RES',
      action: { kind: 'run', command: `open ${item.title}` },
    }));

  const tools = rankMatches(getDbList('tools'), item => `${item.name} ${item.desc || ''} ${item.category || ''}`, needle)
    .slice(0, 8)
    .map(item => ({
      title: item.name,
      meta: item.desc || 'Tool',
      badge: 'TOOL',
      action: { kind: 'run', command: `open ${item.name}` },
    }));

  const total = posts.length + projects.length + resources.length + tools.length;
  if (!total) return [lineEntry(`No results for "${query}"`, 'error', '404')];

  const entries = [lineEntry(`${total} result${total !== 1 ? 's' : ''} for "${query}"`, 'accent', 'FND')];
  if (posts.length) entries.push(listEntry('Posts', posts));
  if (projects.length) entries.push(listEntry('Projects', projects));
  if (resources.length) entries.push(listEntry('Resources', resources));
  if (tools.length) entries.push(listEntry('Tools', tools));
  return entries;
}

function buildOpenEntries(query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return [lineEntry('Usage: open <url|page|name>', 'error', 'ERR')];

  const page = COMMAND_NAV_VIEWS.find(value => value === needle);
  if (page) {
    nav(page);
    return [lineEntry(`Navigated to ${page}`, 'accent', 'NAV')];
  }

  const exactPost = findExactFieldMatch(getDbList('posts'), query, ['id', 'title']);
  if (exactPost) {
    nav('article', exactPost.id);
    return [lineEntry(`Opened post ${exactPost.title}`, 'accent', 'POST')];
  }

  const exactProject = findExactFieldMatch(getDbList('projects'), query, ['id', 'name']);
  if (exactProject) {
    nav('project', exactProject.id);
    return [lineEntry(`Opened project ${exactProject.name}`, 'accent', 'PROJ')];
  }

  const exactResource = findExactFieldMatch(getDbList('resources'), query, ['id', 'title']);
  if (exactResource) {
    nav('resource', exactResource.id);
    return [lineEntry(`Opened resource ${exactResource.title}`, 'accent', 'RES')];
  }

  const exactTool = findExactFieldMatch(getDbList('tools'), query, ['id', 'name']);
  if (exactTool) {
    nav('tools');
    if (typeof isMobileViewport === 'function' && isMobileViewport() && typeof openToolsRail === 'function') openToolsRail();
    openTool(exactTool.id, { scroll: true, source: 'terminal', keepRailOpen: true });
    return [lineEntry(`Opened tool ${exactTool.name}`, 'accent', 'TOOL')];
  }

  const pages = rankMatches(COMMAND_NAV_VIEWS, value => value, needle)
    .slice(0, 6)
    .map(value => ({
      title: value,
      meta: `Go to ${value}`,
      badge: 'NAV',
      action: { kind: 'run', command: `open ${value}` },
    }));

  const posts = rankMatches(getDbList('posts'), item => `${item.title} ${item.excerpt || item.description || ''} ${(item.tags || []).join(' ')}`, needle)
    .slice(0, 8)
    .map(item => ({
      title: item.title,
      meta: item.excerpt || item.description || 'Blog post',
      badge: 'POST',
      action: { kind: 'run', command: `open ${item.title}` },
    }));

  const projects = rankMatches(getDbList('projects'), item => `${item.name} ${item.desc || ''} ${item.category || ''}`, needle)
    .slice(0, 8)
    .map(item => ({
      title: item.name,
      meta: item.desc || 'Project',
      badge: 'PROJ',
      action: { kind: 'run', command: `open ${item.name}` },
    }));

  const resources = rankMatches(getDbList('resources'), item => `${item.title} ${item.desc || ''} ${item.type || ''}`, needle)
    .slice(0, 8)
    .map(item => ({
      title: item.title,
      meta: item.desc || 'Resource',
      badge: 'RES',
      action: { kind: 'run', command: `open ${item.title}` },
    }));

  const tools = rankMatches(getDbList('tools'), item => `${item.name} ${item.desc || ''} ${item.category || ''}`, needle)
    .slice(0, 8)
    .map(item => ({
      title: item.name,
      meta: item.desc || 'Tool',
      badge: 'TOOL',
      action: { kind: 'run', command: `open ${item.name}` },
    }));

  const total = pages.length + posts.length + projects.length + resources.length + tools.length;
  if (!total) return [lineEntry(`Nothing matched "${query}"`, 'error', 'ERR')];

  const entries = [lineEntry(`No exact match for "${query}". Showing results.`, 'accent', 'OPEN')];
  if (pages.length) entries.push(listEntry('Pages', pages));
  if (posts.length) entries.push(listEntry('Posts', posts));
  if (projects.length) entries.push(listEntry('Projects', projects));
  if (resources.length) entries.push(listEntry('Resources', resources));
  if (tools.length) entries.push(listEntry('Tools', tools));
  return entries;
}

function buildLsEntries(scope) {
  const normalized = String(scope || '').trim().toLowerCase();
  if (!normalized) {
    return [
      lineEntry('Available collections', 'accent', 'LS'),
      listEntry('Collections', LS_SCOPES.map(name => {
        const count = getDbList(name).length;
        return {
          title: name,
          meta: `${count} item${count !== 1 ? 's' : ''}`,
          badge: 'LS',
          action: { kind: 'run', command: `ls ${name}` },
        };
      })),
    ];
  }

  if (normalized === 'tools') {
    const items = getDbList('tools').map(item => ({
      title: item.name,
      meta: item.desc || 'Tool',
      badge: 'TOOL',
      action: { kind: 'run', command: `open ${item.name}` },
    }));
    return items.length ? [lineEntry(`${items.length} tool${items.length !== 1 ? 's' : ''}`, 'accent', 'LS'), listEntry('Tools', items)] : [lineEntry('No tools loaded', 'dim', 'LS')];
  }

  if (normalized === 'posts') {
    const items = getDbList('posts').map(item => ({
      title: item.title,
      meta: item.excerpt || item.description || 'Blog post',
      badge: 'POST',
      action: { kind: 'run', command: `open ${item.title}` },
    }));
    return items.length ? [lineEntry(`${items.length} post${items.length !== 1 ? 's' : ''}`, 'accent', 'LS'), listEntry('Posts', items)] : [lineEntry('No posts loaded', 'dim', 'LS')];
  }

  if (normalized === 'projects') {
    const items = getDbList('projects').map(item => ({
      title: item.name,
      meta: item.desc || 'Project',
      badge: 'PROJ',
      action: { kind: 'run', command: `open ${item.name}` },
    }));
    return items.length ? [lineEntry(`${items.length} project${items.length !== 1 ? 's' : ''}`, 'accent', 'LS'), listEntry('Projects', items)] : [lineEntry('No projects loaded', 'dim', 'LS')];
  }

  if (normalized === 'resources') {
    const items = getDbList('resources').map(item => ({
      title: item.title,
      meta: item.desc || 'Resource',
      badge: 'RES',
      action: { kind: 'run', command: `open ${item.title}` },
    }));
    return items.length ? [lineEntry(`${items.length} resource${items.length !== 1 ? 's' : ''}`, 'accent', 'LS'), listEntry('Resources', items)] : [lineEntry('No resources loaded', 'dim', 'LS')];
  }

  return [lineEntry('Usage: ls [tools|posts|projects|resources]', 'error', 'ERR')];
}

function buildWhoamiEntries() {
  const site = (typeof DB !== 'undefined' && DB.site) ? DB.site : {};
  const socials = Object.entries(site.social || {})
    .filter(([, url]) => !!url)
    .map(([name, url]) => ({
      title: name,
      meta: url,
      badge: 'URL',
      action: { kind: 'run', command: `open ${url}` },
    }));

  const entries = [
    lineEntry(`${site.name || 'Nomu'} :: ${site.tagline || 'Terminal'}`, 'accent', 'USR'),
    lineEntry(site.bio || 'No bio configured', 'default', 'BIO'),
    lineEntry(`Current view: ${typeof CUR_VIEW !== 'undefined' ? CUR_VIEW : 'unknown'}`, 'dim', 'CTX'),
  ];
  if (socials.length) entries.push(listEntry('Socials', socials));
  return entries;
}

function executeCommand(input) {
  const parsed = parseCommandLine(input);
  if (!parsed) return;

  pushHistory(parsed.clean);

  if (parsed.cmdToken === 'clear') {
    TERMINAL_STATE.transcript = [];
    TERMINAL_STATE.scrollPending = true;
    setBuffer('', { focus: true });
    return;
  }

  const entries = [commandEntry(parsed.clean)];
  const arg = parsed.arg;
  const argRaw = parsed.argRaw;

  switch (parsed.cmdToken) {
    case 'help':
      entries.push(...buildHelpEntries());
      break;
    case 'search':
      entries.push(...buildSearchEntries(argRaw));
      break;
    case 'open': {
      const target = argRaw.trim();
      if (!target) {
        entries.push(lineEntry('Usage: open <url|page|name>', 'error', 'ERR'));
        break;
      }
      const url = normalizeExternalUrl(target);
      if (url) {
        openExternalUrl(url);
        entries.push(lineEntry(`Opened ${url}`, 'accent', 'URL'));
        break;
      }
      entries.push(...buildOpenEntries(target));
      break;
    }
    case 'ls':
      entries.push(...buildLsEntries(arg));
      break;
    case 'history':
      entries.push(...buildHistoryEntries());
      break;
    case 'volume': {
      const value = Number(arg);
      if (Number.isNaN(value)) {
        entries.push(lineEntry('Usage: volume <0-100>', 'error', 'ERR'));
        break;
      }
      const volume = Math.max(0, Math.min(100, value));
      const slider = document.getElementById('vol-slider');
      if (slider) slider.value = String(volume / 100);
      if (typeof setVol === 'function') setVol(volume / 100);
      entries.push(lineEntry(`Volume set to ${volume}%`, 'accent', 'VOL'));
      break;
    }
    case 'song': {
      const action = arg.toLowerCase();
      if (!action) {
        entries.push(lineEntry('Usage: song <next|prev|play|pause|toggle|name>', 'error', 'ERR'));
        break;
      }
      if (SONG_ACTIONS.includes(action)) {
        if ((action === 'next' || action === 'skip') && typeof nextTrack === 'function') nextTrack();
        else if ((action === 'prev' || action === 'previous') && typeof prevTrack === 'function') prevTrack();
        else if (action === 'toggle' && typeof togglePlay === 'function') togglePlay();
        else if (action === 'play' && typeof togglePlay === 'function' && !IS_PLAYING) togglePlay();
        else if (action === 'pause' && typeof togglePlay === 'function' && IS_PLAYING) togglePlay();
        entries.push(lineEntry(`Song command: ${action}`, 'accent', 'MUSIC'));
        break;
      }
      const track = findBestMatch(getDbList('music'), arg, ['title', 'id']);
      if (!track) {
        entries.push(lineEntry(`Track not found: ${arg || '(empty)'}`, 'error', 'ERR'));
        break;
      }
      const idx = getDbList('music').findIndex(item => item === track);
      if (idx !== -1) {
        TRACK_IDX = idx;
        IS_PLAYING = false;
        if (typeof initPlayer === 'function') initPlayer();
        if (typeof togglePlay === 'function') togglePlay();
      }
      entries.push(lineEntry(`Playing ${track.title}`, 'accent', 'TRACK'));
      break;
    }
    case 'sfx': {
      const mode = arg.toLowerCase();
      if (mode === 'on' || mode === '1') {
        setSfxEnabledSilent(true);
        entries.push(lineEntry('Sound effects enabled', 'accent', 'SFX'));
      } else if (mode === 'off' || mode === '0') {
        setSfxEnabledSilent(false);
        entries.push(lineEntry('Sound effects disabled', 'accent', 'SFX'));
      } else {
        entries.push(lineEntry('Usage: sfx on|off|1|0', 'error', 'ERR'));
      }
      break;
    }
    case 'color': {
      const parts = arg.split(/\s+/).filter(Boolean);
      const mode = String(parts[0] || '').toLowerCase();
      if (mode === 'theme') {
        const name = parts.slice(1).join(' ');
        const idx = resolveThemeIndex(name);
        if (idx === -1) {
          entries.push(lineEntry(`Theme not found: ${name || '(empty)'}`, 'error', 'ERR'));
        } else {
          applyTheme(idx, false);
          const theme = getThemeList()[idx];
          entries.push(lineEntry(`Theme set to ${theme.name}`, 'accent', 'THEME'));
        }
        break;
      }
      if (mode === 'hex') {
        const hex = String(parts[1] || '');
        if (!looksLikeHex(hex)) {
          entries.push(lineEntry('Usage: color hex <#rrggbb>', 'error', 'ERR'));
        } else {
          applyCustomTheme(hex);
          entries.push(lineEntry(`Custom theme applied: ${hex.startsWith('#') ? hex : `#${hex}`}`, 'accent', 'HEX'));
        }
        break;
      }
      if (looksLikeHex(arg)) {
        applyCustomTheme(arg);
        entries.push(lineEntry(`Custom theme applied: ${arg.startsWith('#') ? arg : `#${arg}`}`, 'accent', 'HEX'));
        break;
      }
      const idx = resolveThemeIndex(arg);
      if (idx !== -1) {
        applyTheme(idx, false);
        const theme = getThemeList()[idx];
        entries.push(lineEntry(`Theme set to ${theme.name}`, 'accent', 'THEME'));
        break;
      }
      entries.push(lineEntry('Usage: color theme <name> | color hex <#rrggbb>', 'error', 'ERR'));
      break;
    }
    case 'filter': {
      const tokens = arg.split(/\s+/).filter(Boolean);
      const scope = String(tokens[0] || '').toLowerCase();
      const rest = tokens.slice(1).join(' ').trim();
      if (!scope) {
        entries.push(lineEntry('Usage: filter blog|projects|resources ...', 'error', 'ERR'));
        break;
      }
      if (scope === 'blog') {
        const tag = rest || 'all';
        filterBlog(tag);
        nav('blog');
        entries.push(lineEntry(`Blog filter set to ${tag}`, 'accent', 'FILTER'));
        break;
      }
      if (scope === 'projects') {
        const type = String(tokens[1] || '').toLowerCase();
        const value = tokens.slice(2).join(' ').trim();
        if (type === 'category') {
          setProjCat(value || 'All');
          nav('projects');
          entries.push(lineEntry(`Project category set to ${value || 'All'}`, 'accent', 'FILTER'));
          break;
        }
        if (type === 'focus') {
          const focusMap = typeof PROJECT_FOCUS_MAP !== 'undefined' ? PROJECT_FOCUS_MAP : {};
          const categories = Object.keys(focusMap);
          let foundCategory = null;
          categories.some(category => {
            const values = focusMap[category] || [];
            if (values.some(item => String(item).toLowerCase() === value.toLowerCase())) {
              foundCategory = category;
              return true;
            }
            return false;
          });
          if (foundCategory && PROJ_CAT_FILTER !== foundCategory) setProjCat(foundCategory);
          setProjFocus(value || 'All');
          nav('projects');
          entries.push(lineEntry(`Project focus set to ${value || 'All'}`, 'accent', 'FILTER'));
          break;
        }
        entries.push(lineEntry('Usage: filter projects category <name> | filter projects focus <name>', 'error', 'ERR'));
        break;
      }
      if (scope === 'resources') {
        const type = String(tokens[1] || '').toLowerCase();
        const value = tokens.slice(2).join(' ').trim();
        if (type === 'type') {
          setResType(value || 'All');
          nav('resources');
          entries.push(lineEntry(`Resource type set to ${value || 'All'}`, 'accent', 'FILTER'));
          break;
        }
        entries.push(lineEntry('Usage: filter resources type <name>', 'error', 'ERR'));
        break;
      }
      entries.push(lineEntry('Usage: filter blog|projects|resources ...', 'error', 'ERR'));
      break;
    }
    case 'favorites': {
      const tokens = arg.split(/\s+/).filter(Boolean);
      const scope = String(tokens[0] || '').toLowerCase();
      const action = String(tokens[1] || '').toLowerCase();
      if (scope !== 'tools') {
        entries.push(lineEntry('Usage: favorites tools <show|hide|toggle>', 'error', 'ERR'));
        break;
      }
      if (action === 'show') {
        window.setToolsFavFilter?.(true);
        entries.push(lineEntry('Tool favorites filter enabled', 'accent', 'FAV'));
      } else if (action === 'hide') {
        window.setToolsFavFilter?.(false);
        entries.push(lineEntry('Tool favorites filter disabled', 'accent', 'FAV'));
      } else if (action === 'toggle') {
        window.toggleToolsFavFilter?.();
        entries.push(lineEntry('Tool favorites filter toggled', 'accent', 'FAV'));
      } else {
        entries.push(lineEntry('Usage: favorites tools <show|hide|toggle>', 'error', 'ERR'));
      }
      break;
    }
    case 'whoami':
      entries.push(...buildWhoamiEntries());
      break;
    case 'time':
      entries.push(lineEntry(formatLocalTime(new Date()), 'accent', 'TIME'));
      break;
    case 'echo':
      entries.push(lineEntry(argRaw, 'default', 'ECHO'));
      break;
    case 'ping':
      entries.push(lineEntry('pong :: terminal online', 'accent', 'PONG'));
      break;
    default:
      entries.push(lineEntry(`command not found: ${parsed.token}`, 'error', 'ERR'));
      break;
  }

  TERMINAL_STATE.transcript.push(...entries);
  TERMINAL_STATE.scrollPending = true;
  setBuffer('', { focus: true });
}

function stepHistory(delta) {
  if (!TERMINAL_STATE.history.length) return;
  if (TERMINAL_STATE.historyCursor === -1) {
    TERMINAL_STATE.historyDraft = TERMINAL_DOM.input ? TERMINAL_DOM.input.value : TERMINAL_STATE.buffer;
    if (delta < 0) return;
    TERMINAL_STATE.historyCursor = 0;
  } else if (delta < 0) {
    TERMINAL_STATE.historyCursor -= 1;
    if (TERMINAL_STATE.historyCursor < 0) {
      const draft = TERMINAL_STATE.historyDraft;
      TERMINAL_STATE.historyCursor = -1;
      setBuffer(draft, { focus: true, preserveHistory: true });
      return;
    }
  } else {
    TERMINAL_STATE.historyCursor = Math.min(TERMINAL_STATE.history.length - 1, TERMINAL_STATE.historyCursor + 1);
  }

  const value = TERMINAL_STATE.history[TERMINAL_STATE.historyCursor] || '';
  setBuffer(value, { focus: true, preserveHistory: true });
}

function startCompletionCycle(direction) {
  if (!TERMINAL_STATE.completions.length) return false;
  TERMINAL_STATE.completionCycle = {
    candidates: TERMINAL_STATE.completions.slice(),
    index: direction > 0 ? 0 : TERMINAL_STATE.completions.length - 1,
  };
  const candidate = TERMINAL_STATE.completionCycle.candidates[TERMINAL_STATE.completionCycle.index];
  setBuffer(applyCompletionCandidate(candidate, true), { focus: true, keepCycle: true });
  return true;
}

function cycleCompletion(direction) {
  if (!TERMINAL_STATE.completionCycle) return startCompletionCycle(direction);
  const total = TERMINAL_STATE.completionCycle.candidates.length;
  if (!total) return false;
  TERMINAL_STATE.completionCycle.index = (TERMINAL_STATE.completionCycle.index + direction + total) % total;
  const candidate = TERMINAL_STATE.completionCycle.candidates[TERMINAL_STATE.completionCycle.index];
  setBuffer(applyCompletionCandidate(candidate, true), { focus: true, keepCycle: true });
  return true;
}

function handleTabCompletion(direction) {
  if (!isCaretAtEnd()) return;
  if (TERMINAL_STATE.completionCycle) {
    cycleCompletion(direction);
    return;
  }

  if (!TERMINAL_STATE.completions.length) return;
  const currentPrefix = TERMINAL_STATE.buffer.slice(TERMINAL_STATE.completions[0].replaceStart, TERMINAL_STATE.completions[0].replaceEnd);
  const lcp = longestCommonPrefix(TERMINAL_STATE.completions.map(candidate => candidate.insertText));

  if (TERMINAL_STATE.completions.length === 1 && lcp.toLowerCase() === currentPrefix.toLowerCase()) {
    setBuffer(applyCompletionCandidate(TERMINAL_STATE.completions[0], true), { focus: true });
    return;
  }

  if (lcp && lcp.length > currentPrefix.length) {
    const base = TERMINAL_STATE.completions[0];
    const nextValue = `${TERMINAL_STATE.buffer.slice(0, base.replaceStart)}${lcp}${TERMINAL_STATE.buffer.slice(base.replaceEnd)}`;
    setBuffer(nextValue, { focus: true });
    return;
  }

  startCompletionCycle(direction);
}

function clearTranscript() {
  TERMINAL_STATE.transcript = [];
  TERMINAL_STATE.scrollPending = true;
  renderTerminal();
}

function dispatchTerminalAction(action) {
  if (!action) return;
  switch (action.kind) {
    case 'fill':
      setBuffer(action.value, { focus: true });
      break;
    case 'run':
      executeCommand(action.command);
      break;
    case 'completion':
      setBuffer(applyCompletionCandidate(action.candidate, true), { focus: true });
      break;
    default:
      break;
  }
}

function renderEntry(entry) {
  if (entry.kind === 'command') {
    return `
      <div class="terminal-entry terminal-entry-command">
        <span class="terminal-prompt-copy">${escHtml(getPromptLabel())}</span>
        <span class="terminal-command-copy">${escHtml(entry.text)}</span>
      </div>`;
  }

  if (entry.kind === 'line') {
    const tag = entry.tag ? `<span class="terminal-tag">${escHtml(entry.tag)}</span>` : '';
    return `
      <div class="terminal-entry terminal-entry-line tone-${escHtml(entry.tone || 'default')}">
        ${tag}
        <span class="terminal-line-text">${escHtml(entry.text)}</span>
      </div>`;
  }

  if (entry.kind === 'list') {
    const title = entry.title ? `<div class="terminal-list-title">${escHtml(entry.title)}</div>` : '';
    const items = (entry.items || []).map(item => {
      const actionId = item.action ? registerAction(item.action) : '';
      const badge = item.badge ? `<span class="terminal-list-badge">${escHtml(item.badge)}</span>` : '';
      if (actionId) {
        return `
          <button class="terminal-list-item" type="button" data-terminal-action="${actionId}">
            <span class="terminal-list-main">
              <span class="terminal-list-label">${escHtml(item.title)}</span>
              ${item.meta ? `<span class="terminal-list-meta">${escHtml(item.meta)}</span>` : ''}
            </span>
            ${badge}
          </button>`;
      }
      return `
        <div class="terminal-list-item static">
          <span class="terminal-list-main">
            <span class="terminal-list-label">${escHtml(item.title)}</span>
            ${item.meta ? `<span class="terminal-list-meta">${escHtml(item.meta)}</span>` : ''}
          </span>
          ${badge}
        </div>`;
    }).join('');
    return `
      <div class="terminal-entry terminal-entry-list tone-${escHtml(entry.tone || 'default')}">
        ${title}
        <div class="terminal-list-grid">${items}</div>
      </div>`;
  }

  return '';
}

function renderGhost() {
  if (!TERMINAL_DOM.ghost) return;
  if (!isCaretAtEnd() || !TERMINAL_STATE.completions.length) {
    TERMINAL_DOM.ghost.textContent = '';
    TERMINAL_DOM.ghost.style.removeProperty('--ghost-prefix');
    return;
  }

  const index = TERMINAL_STATE.completionIndex >= 0 ? TERMINAL_STATE.completionIndex : 0;
  const candidate = TERMINAL_STATE.completions[index];
  if (!candidate) {
    TERMINAL_DOM.ghost.textContent = '';
    TERMINAL_DOM.ghost.style.removeProperty('--ghost-prefix');
    return;
  }

  const ghostValue = applyCompletionCandidate(candidate, false);
  if (!ghostValue.toLowerCase().startsWith(TERMINAL_STATE.buffer.toLowerCase())) {
    TERMINAL_DOM.ghost.textContent = '';
    TERMINAL_DOM.ghost.style.removeProperty('--ghost-prefix');
    return;
  }

  const suffix = ghostValue.slice(TERMINAL_STATE.buffer.length);
  if (!suffix) {
    TERMINAL_DOM.ghost.textContent = '';
    TERMINAL_DOM.ghost.style.removeProperty('--ghost-prefix');
    return;
  }

  TERMINAL_DOM.ghost.textContent = suffix;
  TERMINAL_DOM.ghost.style.setProperty('--ghost-prefix', String(TERMINAL_STATE.buffer.length));
}

function renderTranscript() {
  if (!TERMINAL_DOM.transcript) return;
  TERMINAL_DOM.transcript.innerHTML = TERMINAL_STATE.transcript.length
    ? TERMINAL_STATE.transcript.map(renderEntry).join('')
    : '<div class="terminal-entry terminal-entry-empty">Session cleared. Type <em>help</em> to continue.</div>';

  if (TERMINAL_STATE.scrollPending) {
    requestAnimationFrame(() => {
      if (!TERMINAL_DOM.transcript) return;
      TERMINAL_DOM.transcript.scrollTop = TERMINAL_DOM.transcript.scrollHeight;
    });
    TERMINAL_STATE.scrollPending = false;
  }
}

function renderCompletions() {
  if (!TERMINAL_DOM.completions) return;
  if (!TERMINAL_STATE.completions.length || !isCaretAtEnd()) {
    TERMINAL_DOM.completions.innerHTML = '';
    return;
  }

  const visibleCount = 3;
  const activeIndex = TERMINAL_STATE.completionIndex >= 0 ? TERMINAL_STATE.completionIndex : 0;
  const start = Math.max(0, Math.min(TERMINAL_STATE.completions.length - visibleCount, activeIndex - 1));
  const visible = TERMINAL_STATE.completions.slice(start, start + visibleCount);

  const items = visible.map((candidate, offset) => {
    const idx = start + offset;
    const actionId = registerAction({ kind: 'completion', candidate });
    return `
      <button class="terminal-completion ${idx === activeIndex ? 'active' : ''}" type="button" data-terminal-action="${actionId}" title="${escHtml(candidate.meta || candidate.label)}">
        <span class="terminal-completion-main">
          <span class="terminal-completion-label">${escHtml(candidate.label)}</span>
        </span>
        <span class="terminal-completion-badge">${escHtml(candidate.badge || '')}</span>
      </button>`;
  }).join('');

  TERMINAL_DOM.completions.innerHTML = items;
}

function renderTerminal() {
  TERMINAL_ACTIONS.clear();
  if (TERMINAL_DOM.promptLabel) TERMINAL_DOM.promptLabel.textContent = getPromptLabel() || TERMINAL_PROMPT_FALLBACK;
  renderTranscript();
  renderCompletions();
  renderGhost();
}

function openSearch() {
  if (!TERMINAL_DOM.modal) return;
  ensureTerminalBoot();
  TERMINAL_DOM.modal.classList.add('open');
  document.body.classList.add('search-open');
  updateCompletionState();
  renderTerminal();
  focusInputAtEnd();
  if (typeof playSfx === 'function') playSfx('scan');
}

function closeSearch(event) {
  if (event && event.target !== TERMINAL_DOM.modal) return;
  TERMINAL_DOM.modal?.classList.remove('open');
  document.body.classList.remove('search-open');
  TERMINAL_DOM.input?.blur();
}

function openTerminal() {
  openSearch();
}

function closeTerminal(event) {
  closeSearch(event);
}

function handleTerminalActionClick(event) {
  const trigger = event.target.closest('[data-terminal-action]');
  if (!trigger) return;
  const action = TERMINAL_ACTIONS.get(trigger.dataset.terminalAction);
  if (!action) return;
  event.preventDefault();
  dispatchTerminalAction(action);
}

TERMINAL_DOM.transcript?.addEventListener('click', handleTerminalActionClick);
TERMINAL_DOM.completions?.addEventListener('click', handleTerminalActionClick);

TERMINAL_DOM.promptRow?.addEventListener('click', event => {
  if (event.target.closest('.search-esc')) return;
  focusInputAtEnd();
});

TERMINAL_DOM.input?.addEventListener('input', () => {
  TERMINAL_STATE.buffer = TERMINAL_DOM.input.value;
  TERMINAL_STATE.historyCursor = -1;
  TERMINAL_STATE.historyDraft = TERMINAL_STATE.buffer;
  clearCompletionCycle();
  updateCompletionState();
  renderTerminal();
});

['click', 'select', 'keyup'].forEach(eventName => {
  TERMINAL_DOM.input?.addEventListener(eventName, event => {
    const key = String(event.key || '');
    if (eventName === 'keyup' && !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
    updateCompletionState();
    renderTerminal();
  });
});

TERMINAL_DOM.input?.addEventListener('keydown', event => {
  if (!TERMINAL_DOM.modal?.classList.contains('open')) return;

  const key = String(event.key || '').toLowerCase();
  const stop = () => {
    event.preventDefault();
    event.stopPropagation();
  };

  if (event.ctrlKey && !event.metaKey && !event.altKey) {
    if (key === 'a') {
      stop();
      setCaret(0);
      updateCompletionState();
      renderTerminal();
      return;
    }
    if (key === 'e') {
      stop();
      focusInputAtEnd();
      updateCompletionState();
      renderTerminal();
      return;
    }
    if (key === 'u') {
      stop();
      const cursor = TERMINAL_DOM.input.selectionStart || 0;
      const next = TERMINAL_DOM.input.value.slice(cursor);
      setBuffer(next, { focus: true });
      setCaret(0);
      return;
    }
    if (key === 'k') {
      stop();
      const cursor = TERMINAL_DOM.input.selectionStart || 0;
      const next = TERMINAL_DOM.input.value.slice(0, cursor);
      setBuffer(next, { focus: true });
      setCaret(cursor);
      return;
    }
    if (key === 'l') {
      stop();
      clearTranscript();
      focusInputAtEnd();
      return;
    }
  }

  if (key === 'arrowup') {
    stop();
    stepHistory(1);
    return;
  }

  if (key === 'arrowdown') {
    stop();
    stepHistory(-1);
    return;
  }

  if (key === 'tab') {
    stop();
    handleTabCompletion(event.shiftKey ? -1 : 1);
    return;
  }

  if (key === 'enter') {
    stop();
    executeCommand(TERMINAL_DOM.input.value);
  }
});

document.addEventListener('keydown', event => {
  const key = String(event.key || '').toLowerCase();
  const isOpen = TERMINAL_DOM.modal?.classList.contains('open');

  if ((event.ctrlKey || event.metaKey) && key === 'k' && !isOpen) {
    event.preventDefault();
    openSearch();
    return;
  }

  if (!isOpen) return;

  if (key === 'escape') {
    event.preventDefault();
    closeSearch({ target: TERMINAL_DOM.modal });
  }
});

updateCompletionState();
renderTerminal();

window.openTerminal = openTerminal;
window.closeTerminal = closeTerminal;
window.openSearch = openSearch;
window.closeSearch = closeSearch;
