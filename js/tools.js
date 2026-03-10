import { TOOL_CATEGORIES, TOOL_DEFS, buildToolIndex } from './tools/registry.js';
import { renderToolShell, renderDefaultBody } from './tools/shared/tool-shell.js';
import { buildDefaultState, normalizeOptions } from './tools/shared/fields.js';
import { loadToolState, saveToolState, clearToolState } from './tools/shared/storage.js';
import { emitToast, qs, qsa, clampNumber } from './tools/shared/dom.js';
import { safeString } from './tools/shared/format.js';

const TOOL_INDEX = buildToolIndex(TOOL_DEFS);
const TOOL_BY_ID = new Map(TOOL_DEFS.map(tool => [tool.id, tool]));
const TOOL_MODULE_CACHE = new Map();
const TOOL_RUNTIME = new Map();
const FAVORITES_KEY = 'tools:favorites';
const LAST_BY_CAT_KEY = 'tools:last-by-category';
let TOOL_FAVORITES = new Set();
let TOOL_FAV_FILTER = false;
let AUTO_OPEN_LOCK = false;
let TOOL_LAST_BY_CAT = {};
let TOOL_LIST_ORDER = [];
let TOOL_LIST_FOCUS = -1;

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = JSON.parse(raw || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (_) {
    return new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...TOOL_FAVORITES]));
  } catch (_) {
    return;
  }
}

function toggleFavorite(id) {
  if (TOOL_FAVORITES.has(id)) TOOL_FAVORITES.delete(id);
  else TOOL_FAVORITES.add(id);
  saveFavorites();
}

function loadLastByCategory() {
  try {
    const raw = localStorage.getItem(LAST_BY_CAT_KEY);
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function saveLastByCategory() {
  try {
    localStorage.setItem(LAST_BY_CAT_KEY, JSON.stringify(TOOL_LAST_BY_CAT));
  } catch (_) {
    return;
  }
}

function recordLastByCategory(toolId, category) {
  if (!category) return;
  TOOL_LAST_BY_CAT[category] = toolId;
  saveLastByCategory();
}

function ensureRuntime(toolId) {
  if (!TOOL_RUNTIME.has(toolId)) TOOL_RUNTIME.set(toolId, { computeToken: 0, file: null, timer: null });
  return TOOL_RUNTIME.get(toolId);
}

function getToolCategory(tool) {
  return tool.category || tool.tag || TOOL_CATEGORIES[0];
}

function deriveDbTools() {
  if (!window.DB) return;
  window.DB.tools = TOOL_DEFS.map(tool => ({
    id: tool.id,
    name: tool.name,
    desc: tool.description,
    tag: tool.category,
    category: tool.category,
    icon: tool.icon,
  }));
}

function getCategoryList() {
  return TOOL_CATEGORIES.slice();
}

function normalizeState(module, schema, state) {
  let next = { ...state };
  (schema.fields || []).forEach(field => {
    next = normalizeOptions(field, next);
  });
  if (typeof module.normalize === 'function') {
    next = module.normalize(next) || next;
  }
  return next;
}

function filterPersistedState(schema, state) {
  const out = {};
  const fields = schema.fields || [];
  fields.forEach(field => {
    if (field.persist === false) return;
    out[field.id] = state[field.id];
  });
  if (schema.input && schema.input.persist !== false) {
    out[schema.input.id] = state[schema.input.id];
  }
  return out;
}

function getSearchHay(id) {
  return TOOL_INDEX.find(t => t.id === id)?.hay || '';
}

function getFilteredTools() {
  const query = safeString(window.TOOL_QUERY).trim().toLowerCase();
  return TOOL_DEFS.filter(tool => {
    if (window.TOOL_CATEGORY_FILTER && tool.category !== window.TOOL_CATEGORY_FILTER) return false;
    if (!query) return true;
    return getSearchHay(tool.id).includes(query);
  });
}

function setToolListFocus(idx) {
  TOOL_LIST_FOCUS = idx;
  qsa(document, '#tools-rail-list [data-tool-open]').forEach((el, i) => {
    el.classList.toggle('focus', i === idx);
  });
}

function renderToolList() {
  let tools = getFilteredTools();
  if (TOOL_FAV_FILTER) {
    tools = tools.filter(tool => TOOL_FAVORITES.has(tool.id));
  }
  const list = document.getElementById('tools-rail-list');
  if (!list) return;

  if (window.CUR_TOOL && !tools.some(tool => tool.id === window.CUR_TOOL)) {
    window.CUR_TOOL = null;
  }

  if (!tools.length) {
    const msg = TOOL_FAV_FILTER ? 'No favorites yet.' : 'No tools match this filter.';
    list.innerHTML = `<div class="toc-empty">${msg}</div>`;
    TOOL_LIST_ORDER = [];
    TOOL_LIST_FOCUS = -1;
    return;
  }

  let order = [];
  const favorites = tools.filter(tool => TOOL_FAVORITES.has(tool.id));
  const mainTools = TOOL_FAV_FILTER ? tools : tools.filter(tool => !TOOL_FAVORITES.has(tool.id));
  const renderRow = tool => {
    const iconSvg = window.TOOL_ICONS ? window.TOOL_ICONS[tool.icon] : null;
    const iconHtml = iconSvg ? `<span class="tool-icon">${iconSvg}</span>` : '';
    order.push(tool.id);
    return `
      <div class="toc-item ${window.CUR_TOOL === tool.id ? 'active' : ''}" data-tool-open="${tool.id}">
        ${iconHtml}${tool.name}
        <button class="tool-fav-btn ${TOOL_FAVORITES.has(tool.id) ? 'active' : ''}" data-tool-fav="${tool.id}" aria-label="Toggle favorite">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15 9 22 9 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9 9 9" />
          </svg>
        </button>
      </div>
    `;
  };

  const mainBlock = mainTools.length
    ? `
      <div class="tools-rail-section tools-rail-main">
        <div class="qb-label">${TOOL_FAV_FILTER ? 'Favorites' : 'All tools'}</div>
        ${mainTools.map(renderRow).join('')}
      </div>
    `
    : '';

  const favBlock = (!TOOL_FAV_FILTER && favorites.length)
    ? `
      <div class="tools-rail-section tools-rail-favorites">
        <div class="qb-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15 9 22 9 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9 9 9" />
          </svg>
          Favorites
        </div>
        ${favorites.map(renderRow).join('')}
      </div>
    `
    : '';

  list.innerHTML = favBlock + mainBlock;
  TOOL_LIST_ORDER = order;

  if (TOOL_LIST_ORDER.length) {
    const currentIdx = window.CUR_TOOL ? TOOL_LIST_ORDER.indexOf(window.CUR_TOOL) : -1;
    const nextIdx = currentIdx !== -1 ? currentIdx : Math.min(TOOL_LIST_ORDER.length - 1, Math.max(0, TOOL_LIST_FOCUS));
    setToolListFocus(nextIdx);
  } else {
    TOOL_LIST_FOCUS = -1;
  }

  const favChip = document.getElementById('tools-fav-filter');
  if (favChip) favChip.classList.toggle('active', TOOL_FAV_FILTER);
}

function renderPanelPlaceholder() {
  const panel = document.getElementById('tools-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="tool-shell tool-shell-empty">
      <div class="tool-shell-header">
        <div class="tool-shell-title">Select a tool to begin</div>
        <div class="tool-shell-desc">Pick a tool from the list to see its settings and output.</div>
      </div>
    </div>`;
}

async function loadToolModule(toolId) {
  if (TOOL_MODULE_CACHE.has(toolId)) return TOOL_MODULE_CACHE.get(toolId);
  const def = TOOL_BY_ID.get(toolId);
  if (!def) throw new Error('Tool not found');
  const modPromise = def.loader().then(mod => mod).catch(err => {
    TOOL_MODULE_CACHE.delete(toolId);
    throw err;
  });
  TOOL_MODULE_CACHE.set(toolId, modPromise);
  return modPromise;
}

function setOutputState(state, outputs) {
  const next = { ...state };
  next.__outputs = outputs || {};
  return next;
}

function updateOutputs(panel, outputs) {
  if (!panel) return;
  Object.entries(outputs || {}).forEach(([id, value]) => {
    const el = panel.querySelector(`[data-output-id="${id}"]`);
    if (!el) return;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') el.value = value ?? '';
    else el.textContent = value ?? '';
  });
}

function updateErrors(panel, errors) {
  if (!panel) return;
  qsa(panel, '[data-error-for]').forEach(el => {
    const key = el.getAttribute('data-error-for');
    const msg = errors?.[key] || '';
    el.textContent = msg;
  });
}

async function computeTool(module, schema, state, runtime, panel) {
  if (!module.compute) return state;
  const token = ++runtime.computeToken;
  let errors = {};
  if (typeof module.validate === 'function') {
    errors = module.validate(state) || {};
  }
  updateErrors(panel, errors);

  let result = null;
  try {
    result = module.compute(state, runtime);
    if (result && typeof result.then === 'function') result = await result;
  } catch (err) {
    updateErrors(panel, { _global: err.message || 'Failed to compute output.' });
    return state;
  }

  if (token !== runtime.computeToken) return state;
  const outputs = result?.outputs || result?.output || {};
  const outputMap = Array.isArray(outputs)
    ? outputs.reduce((acc, item, idx) => {
        acc[String(idx)] = item;
        return acc;
      }, {})
    : (typeof outputs === 'object' ? outputs : { main: outputs });
  const nextState = setOutputState(state, outputMap);
  updateOutputs(panel, outputMap);
  if (typeof module.onComputed === 'function') {
    module.onComputed({ state: nextState, outputs: outputMap, runtime, panel });
  }
  return nextState;
}

function getPrimaryOutput(schema, state) {
  const outputs = state.__outputs || {};
  if (schema.outputs && schema.outputs.length) {
    return outputs[schema.outputs[0].id] ?? '';
  }
  if (schema.output) {
    return outputs[schema.output.id] ?? '';
  }
  return outputs.main ?? '';
}

function renderActions(schema, tool, module) {
  const buttons = [];
  if (schema.runMode === 'manual') {
    const label = schema.runLabel || 'Run';
    buttons.push(`<button class="btn btn-primary" type="button" data-tool-action="run">${label}</button>`);
  }
  if (schema.supportsSwap || typeof module.swap === 'function') {
    buttons.push(`<button class="btn btn-ghost" type="button" data-tool-action="swap">Swap</button>`);
  }
  if (!schema.hideReset) {
    buttons.push(`<button class="btn btn-ghost" type="button" data-tool-action="reset">Reset</button>`);
  }
  if (tool.supportsCopy) {
    buttons.push(`<button class="btn btn-ghost" type="button" data-tool-action="copy">Copy output</button>`);
  }
  if (tool.supportsDownload) {
    buttons.push(`<button class="btn btn-ghost" type="button" data-tool-action="download">Download</button>`);
  }
  return buttons.join('');
}

async function renderToolPanel(toolId) {
  const panel = document.getElementById('tools-panel');
  if (!panel) return;
  const tool = TOOL_BY_ID.get(toolId);
  if (!tool) return renderPanelPlaceholder();

  panel.innerHTML = '<div class="tools-loading">Loading tool...</div>';
  let module = null;
  try {
    module = await loadToolModule(toolId);
  } catch (err) {
    panel.innerHTML = `<div class=\"tools-loading\">Failed to load tool. ${err.message || ''}</div>`;
    return;
  }
  const schema = module.schema || {};
  const defaults = buildDefaultState(schema);
  let state = defaults;
  if (schema.persist !== false) {
    state = loadToolState(toolId, defaults);
  } else {
    clearToolState(toolId);
  }
  state = normalizeState(module, schema, state);
  const runtime = ensureRuntime(toolId);
  runtime.state = state;

  const bodyHtml = typeof module.render === 'function'
    ? module.render({ tool, schema, state, runtime })
    : renderDefaultBody(schema, setOutputState(state, state.__outputs || {}), {});

  const breadcrumb = `Tools / ${tool.category} / ${tool.name}`;
  const iconSvg = window.TOOL_ICONS ? window.TOOL_ICONS[tool.icon] : null;
  const iconHtml = iconSvg ? `<span class="tool-shell-icon">${iconSvg}</span>` : '';
  panel.innerHTML = renderToolShell({
    tool,
    bodyHtml,
    actionsHtml: renderActions(schema, tool, module),
    breadcrumb,
    iconHtml,
  });

  const shell = panel.querySelector('.tool-shell');
  if (shell) shell.dataset.toolId = toolId;

  if (typeof module.mount === 'function') {
    module.mount({ tool, schema, state, runtime, panel });
  }

  if (schema.runMode !== 'manual') {
    state = await computeTool(module, schema, state, runtime, panel);
  }

  bindPanelEvents(panel, tool, module, schema, state, runtime);
}

function bindPanelEvents(panel, tool, module, schema, state, runtime) {
  const updateStateAndCompute = async updated => {
    state = normalizeState(module, schema, updated);
    runtime.state = state;
    if (schema.persist !== false) {
      saveToolState(tool.id, filterPersistedState(schema, state));
    }
    if (schema.runMode !== 'manual') {
      state = await computeTool(module, schema, state, runtime, panel);
    }
  };

  panel.oninput = async event => {
    const target = event.target;
    if (!target || !target.dataset.fieldId) return;
    const fieldId = target.dataset.fieldId;
    const field = [...(schema.fields || []), schema.input].find(f => f && f.id === fieldId);
    if (!field) return;

    let value = target.value;
    if (field.type === 'toggle') value = target.checked;
    if (field.type === 'number' || field.type === 'range') value = target.value === '' ? '' : Number(target.value);
    if (field.type === 'file') {
      runtime.file = target.files?.[0] || null;
      value = runtime.file ? runtime.file.name : '';
    }

    await updateStateAndCompute({ ...state, [fieldId]: value });
  };

  panel.onchange = panel.oninput;

  panel.onclick = async event => {
    const btn = event.target.closest('[data-tool-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-tool-action');

    if (action === 'back') {
      window.CUR_TOOL = null;
      renderTools();
      return;
    }

    if (action === 'open-list') {
      if (document.body.classList.contains('tools-rail-mobile-open')) closeToolsRail();
      else openToolsRail();
      return;
    }

    if (action === 'reset') {
      const defaults = buildDefaultState(schema);
      state = normalizeState(module, schema, defaults);
      clearToolState(tool.id);
      if (typeof module.onReset === 'function') {
        module.onReset({ runtime, panel });
      }
      renderToolPanel(tool.id);
      emitToast('Tool reset.');
      return;
    }

    if (action === 'swap' && typeof module.swap === 'function') {
      state = normalizeState(module, schema, module.swap(state) || state);
      if (schema.persist !== false) {
        saveToolState(tool.id, filterPersistedState(schema, state));
      }
      renderToolPanel(tool.id);
      return;
    }

    if (action === 'run') {
      state = await computeTool(module, schema, state, runtime, panel);
      return;
    }

    if (action === 'copy') {
      const val = getPrimaryOutput(schema, state);
      if (!val) {
        emitToast('Nothing to copy yet.');
        return;
      }
      await navigator.clipboard.writeText(String(val));
      emitToast('Copied to clipboard!');
      return;
    }

    if (action === 'download') {
      let download = null;
      if (typeof module.getDownload === 'function') {
        download = await module.getDownload({ tool, schema, state, runtime });
      }
      if (!download) {
        const val = getPrimaryOutput(schema, state);
        if (!val) {
          emitToast('Nothing to download yet.');
          return;
        }
        download = {
          filename: `${tool.id}.txt`,
          blob: new Blob([String(val)], { type: 'text/plain' }),
        };
      }
      if (download) {
        const url = download.dataUrl || URL.createObjectURL(download.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = download.filename || `${tool.id}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (!download.dataUrl) URL.revokeObjectURL(url);
      }
    }
  };
}

function renderTools() {
  if (!TOOL_CATEGORIES.includes(window.TOOL_CATEGORY_FILTER)) {
    window.TOOL_CATEGORY_FILTER = TOOL_CATEGORIES[0];
  }
  renderToolList();

  let tools = getFilteredTools();
  if (TOOL_FAV_FILTER) {
    tools = tools.filter(tool => TOOL_FAVORITES.has(tool.id));
  }
  if (!window.CUR_TOOL && tools.length && !AUTO_OPEN_LOCK) {
    AUTO_OPEN_LOCK = true;
    const lastId = TOOL_LAST_BY_CAT[window.TOOL_CATEGORY_FILTER];
    const fallback = tools[0].id;
    const target = tools.some(t => t.id === lastId) ? lastId : fallback;
    openTool(target, { scroll: false });
    return;
  }

  if (window.CUR_TOOL) renderToolPanel(window.CUR_TOOL);
  else renderPanelPlaceholder();
}

function setToolCategory(category) {
  window.TOOL_CATEGORY_FILTER = category;
  AUTO_OPEN_LOCK = false;
  renderTools();
  if (typeof window.updateQuickbar === 'function') window.updateQuickbar();
}

function setToolSearch(query) {
  window.TOOL_QUERY = safeString(query).trimStart();
  renderTools();
  if (typeof window.updateQuickbar === 'function') window.updateQuickbar();
}

async function openTool(id, options = {}) {
  const tool = TOOL_BY_ID.get(id);
  if (!tool) return;
  window.CUR_TOOL = id;
  if (tool.category && tool.category !== window.TOOL_CATEGORY_FILTER) {
    window.TOOL_CATEGORY_FILTER = tool.category;
  }
  recordLastByCategory(id, tool.category);
  renderTools();
  if (typeof window.updateQuickbar === 'function') window.updateQuickbar();

  if (options.scroll) {
    const row = document.querySelector(`[data-tool-open="${id}"]`);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (!options.keepRailOpen) closeToolsRail();
}

function bindHubEvents() {
  const root = document.getElementById('v-tools');
  if (!root || root.dataset.bound === '1') return;
  root.dataset.bound = '1';

  document.addEventListener('keydown', e => {
    if (window.CUR_VIEW !== 'tools') return;
    if (document.getElementById('search-modal')?.classList.contains('open')) return;
    if (document.getElementById('lightbox')?.classList.contains('open')) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (!TOOL_LIST_ORDER.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (TOOL_LIST_FOCUS + 1) % TOOL_LIST_ORDER.length;
      setToolListFocus(next);
      const row = document.querySelectorAll('#tools-rail-list [data-tool-open]')[next];
      row?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (TOOL_LIST_FOCUS - 1 + TOOL_LIST_ORDER.length) % TOOL_LIST_ORDER.length;
      setToolListFocus(next);
      const row = document.querySelectorAll('#tools-rail-list [data-tool-open]')[next];
      row?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter') {
      const id = TOOL_LIST_ORDER[TOOL_LIST_FOCUS];
      if (id) openTool(id);
      return;
    }
    if (e.key.toLowerCase() === 'f') {
      const id = TOOL_LIST_ORDER[TOOL_LIST_FOCUS];
      if (id) {
        toggleFavorite(id);
        renderTools();
      }
    }
  });

  document.addEventListener('click', e => {
    const fav = e.target.closest('[data-tool-fav]');
    if (fav) {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(fav.getAttribute('data-tool-fav'));
      renderTools();
      return;
    }
    const open = e.target.closest('[data-tool-open]');
    if (!open) return;
    if (!document.getElementById('tools-rail')?.contains(open)) return;
    openTool(open.getAttribute('data-tool-open'));
  });

  const favChip = document.getElementById('tools-fav-filter');
  if (favChip) {
    favChip.addEventListener('click', () => {
      TOOL_FAV_FILTER = !TOOL_FAV_FILTER;
      AUTO_OPEN_LOCK = false;
      renderTools();
    });
  }
}

function initTools() {
  deriveDbTools();
  if (!TOOL_CATEGORIES.includes(window.TOOL_CATEGORY_FILTER)) {
    window.TOOL_CATEGORY_FILTER = TOOL_CATEGORIES[0];
  }
  if (window.TOOL_QUERY === undefined || window.TOOL_QUERY === null) {
    window.TOOL_QUERY = '';
  }
  TOOL_FAVORITES = loadFavorites();
  TOOL_LAST_BY_CAT = loadLastByCategory();
  bindHubEvents();
  renderTools();
}

function openToolsRail() {
  document.body.classList.add('tools-rail-mobile-open');
}

function closeToolsRail() {
  document.body.classList.remove('tools-rail-mobile-open');
}

window.getToolCategory = getToolCategory;
window.renderTools = renderTools;
window.setToolCategory = setToolCategory;
window.setToolSearch = setToolSearch;
window.openTool = openTool;
window.openToolsRail = openToolsRail;
window.closeToolsRail = closeToolsRail;
window.TOOL_CATEGORIES = TOOL_CATEGORIES;
window.setToolsFavFilter = value => {
  TOOL_FAV_FILTER = !!value;
  AUTO_OPEN_LOCK = false;
  renderTools();
};
window.toggleToolsFavFilter = () => {
  TOOL_FAV_FILTER = !TOOL_FAV_FILTER;
  AUTO_OPEN_LOCK = false;
  renderTools();
};

initTools();
