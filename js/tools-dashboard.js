// tools-dashboard.js
(function () {
  const STORAGE = {
    TAB: 'tools-tab-v3',
    SUBTAB: 'tools-subtab-v3-',
    FAVORITES: 'tools-favorites-v3',
    TOOL: 'tools-active-v1'
  };
  const DEBOUNCE_MS = 300;
  const state = {
    root: null,
    tabPillsEl: null,
    tabsEl: null,
    panelEl: null,
    searchEl: null,
    searchClear: null,
    favoritesBtn: null,
    favoritesRow: null,
    commandBtn: null,
    activeTab: null,
    activeTool: null,
    subtabByTab: {},
    search: '',
    favoritesOnly: false,
    favorites: new Set(),
    cleanup: [],
    palette: null,
    paletteInput: null,
    paletteList: null,
    paletteItems: [],
    paletteIndex: 0,
    inited: false
  };

  const toolMeta = new Map();
  const tools = new Map();
  const tabs = new Map();
  const memo = {
    word: new Map(),
    readability: new Map(),
    diff: new Map(),
    json: new Map()
  };

  const TOOL_ACCENT_PALETTE = [
    '96,196,255',
    '124,219,186',
    '255,182,123',
    '212,174,255',
    '255,130,164',
    '255,221,120',
    '132,220,255',
    '174,243,139'
  ];

  const workerState = { worker: null, id: 0, waiters: new Map() };
  let zxcvbnLoad = null;

  const esc = (v) => String(v || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);
  const toast = (m) => (typeof window.showToast === 'function' ? window.showToast(m) : console.log(m));

  function debounce(fn, delay = DEBOUNCE_MS) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(String(text || ''));
        return true;
      }
      const ta = document.createElement('textarea');
      ta.value = String(text || '');
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch {
      return false;
    }
  }

  function randomInt(max) {
    const m = Math.max(1, Math.floor(max));
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] % m;
    }
    return Math.floor(Math.random() * m);
  }

  function ensureWorker() {
    if (workerState.worker) return workerState.worker;
    try {
      const w = new Worker('js/tools-worker.js');
      w.addEventListener('message', (e) => {
        const { id, ok, result, error } = e.data || {};
        const waiter = workerState.waiters.get(id);
        if (!waiter) return;
        workerState.waiters.delete(id);
        if (ok) waiter.resolve(result);
        else waiter.reject(new Error(error || 'Worker task failed'));
      });
      w.addEventListener('error', () => {
        workerState.waiters.forEach((waiter) => waiter.reject(new Error('Worker crashed')));
        workerState.waiters.clear();
        workerState.worker = null;
      });
      workerState.worker = w;
      return w;
    } catch {
      return null;
    }
  }

  function runWorker(type, payload) {
    return new Promise((resolve, reject) => {
      const w = ensureWorker();
      if (!w) {
        reject(new Error('Worker unavailable'));
        return;
      }
      const id = `req-${Date.now()}-${++workerState.id}`;
      workerState.waiters.set(id, { resolve, reject });
      w.postMessage({ id, type, payload });
    });
  }

  function b64(bytes) {
    let out = '';
    for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
    return btoa(out);
  }
  const b64url = (s) => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const unb64url = (s) => {
    let x = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    while (x.length % 4) x += '=';
    return x;
  };
  const textToB64url = (text) => b64url(b64(new TextEncoder().encode(String(text || ''))));

  async function hashMain({ text, algorithm = 'SHA-256', output = 'hex' }) {
    if (!window.crypto || !window.crypto.subtle) throw new Error('Crypto unavailable');
    const buf = await window.crypto.subtle.digest(algorithm, new TextEncoder().encode(String(text || '')));
    const bytes = new Uint8Array(buf);
    if (output === 'base64') return { digest: b64(bytes) };
    if (output === 'base64url') return { digest: b64url(b64(bytes)) };
    return { digest: Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('') };
  }

  async function hmacMain({ text, secret, algorithm = 'SHA-256', output = 'hex' }) {
    if (!window.crypto || !window.crypto.subtle) throw new Error('Crypto unavailable');
    const enc = new TextEncoder();
    const key = await window.crypto.subtle.importKey('raw', enc.encode(String(secret || '')), { name: 'HMAC', hash: { name: algorithm } }, false, ['sign']);
    const sig = await window.crypto.subtle.sign('HMAC', key, enc.encode(String(text || '')));
    const bytes = new Uint8Array(sig);
    if (output === 'base64') return { digest: b64(bytes) };
    if (output === 'base64url') return { digest: b64url(b64(bytes)) };
    return { digest: Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('') };
  }

  function jsonMain({ input, indent = 2 }) {
    const parsed = typeof input === 'string' ? JSON.parse(input) : input;
    return { formatted: JSON.stringify(parsed, null, clamp(num(indent, 2), 0, 8)) };
  }

  function diffMain({ left, right }) {
    const a = String(left || '').split(/\r?\n/);
    const b = String(right || '').split(/\r?\n/);
    const n = Math.max(a.length, b.length);
    const lines = [];
    let added = 0;
    let removed = 0;
    let context = 0;
    for (let i = 0; i < n; i += 1) {
      if (a[i] === b[i]) {
        if (typeof a[i] === 'string') {
          lines.push({ type: 'context', text: a[i] });
          context += 1;
        }
      } else {
        if (typeof a[i] === 'string') {
          lines.push({ type: 'remove', text: a[i] });
          removed += 1;
        }
        if (typeof b[i] === 'string') {
          lines.push({ type: 'add', text: b[i] });
          added += 1;
        }
      }
    }
    return { lines, stats: { added, removed, context } };
  }

  async function workerOr(type, payload, fallback) {
    try {
      return await runWorker(type, payload);
    } catch {
      return fallback(payload);
    }
  }

  function mountCtx() {
    return {
      esc,
      toast,
      copyText,
      debounce,
      clamp,
      num,
      randomInt,
      memo,
      runWorker,
      workerOr,
      hashMain,
      hmacMain,
      jsonMain,
      diffMain,
      textToB64url,
      b64url,
      unb64url
    };
  }

  function registerMeta(list) {
    list.forEach((item) => toolMeta.set(item.id, { ...item }));
  }

  function registerTool(def) {
    if (!def || !def.id || typeof def.mount !== 'function') throw new Error('Bad tool');
    const meta = toolMeta.get(def.id) || {};
    tools.set(def.id, {
      id: def.id,
      title: def.title || meta.title || def.id,
      description: def.description || meta.description || '',
      icon: def.icon || meta.icon || 'fa-toolbox',
      mount: def.mount
    });
  }

  function registerTab(def) {
    if (!def || !def.id || !Array.isArray(def.tools)) throw new Error('Bad tab');
    tabs.set(def.id, {
      ...def,
      order: num(def.order, 0),
      loaded: false
    });
  }

  function orderedTabs() {
    return Array.from(tabs.values()).sort((a, b) => a.order - b.order);
  }

  function loadFavorites() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE.FAVORITES) || '[]');
      if (Array.isArray(raw)) return new Set(raw.filter((x) => typeof x === 'string'));
    } catch {}
    return new Set();
  }

  function saveFavorites() {
    localStorage.setItem(STORAGE.FAVORITES, JSON.stringify(Array.from(state.favorites)));
  }

  function clearCleanup() {
    state.cleanup.forEach((fn) => {
      try { fn(); } catch {}
    });
    state.cleanup = [];
  }
  function getSubtabs(tab) {
    if (!tab) return [];
    if (!Array.isArray(tab.subtabs) || !tab.subtabs.length) return [{ id: 'all', label: 'All', icon: 'fa-layer-group', tools: tab.tools.slice() }];
    return tab.subtabs.map((s, i) => ({
      id: s.id || `sub-${i}`,
      label: s.label || `Group ${i + 1}`,
      icon: s.icon || 'fa-layer-group',
      tools: Array.isArray(s.tools) ? s.tools.slice() : []
    }));
  }

  async function ensureTabLoaded(tabId) {
    const tab = tabs.get(tabId);
    if (!tab || tab.loaded) return;
    if (typeof tab.load === 'function') await tab.load();
    tab.loaded = true;
  }

  function favoriteState(button, toolId) {
    const on = state.favorites.has(toolId);
    button.classList.toggle('is-favorite', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.setAttribute('title', on ? 'Remove favorite' : 'Add favorite');
  }

  function toggleFavorite(toolId) {
    if (state.favorites.has(toolId)) state.favorites.delete(toolId);
    else state.favorites.add(toolId);
    saveFavorites();
    document.querySelectorAll(`[data-favorite-tool="${toolId}"]`).forEach((btn) => favoriteState(btn, toolId));
    renderFavoritesRow();
    if (state.favoritesOnly) renderWorkspace();
    window.dispatchEvent(new CustomEvent('tools-favorites-changed'));
  }

  function hashCode(value) {
    let out = 0;
    const src = String(value || '');
    for (let i = 0; i < src.length; i += 1) {
      out = ((out << 5) - out) + src.charCodeAt(i);
      out |= 0;
    }
    return Math.abs(out);
  }

  function accentForTool(toolId) {
    const idx = hashCode(toolId) % TOOL_ACCENT_PALETTE.length;
    return TOOL_ACCENT_PALETTE[idx];
  }

  function normalizeScope(scope) {
    return String(scope || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'general';
  }

  function ToolHeader(tool, meta = {}) {
    const header = document.createElement('header');
    header.className = 'tool-header';
    const tabBadge = meta.tabLabel
      ? `<span class="tool-header-badge">${esc(meta.tabLabel)}</span>`
      : '';
    header.innerHTML = `
      <div class="tool-header-icon" aria-hidden="true"><i class="fas ${esc(tool.icon)}"></i></div>
      <div class="tool-header-copy">
        <div class="tool-header-title-row"><h3>${esc(tool.title)}</h3>${tabBadge}</div>
        <p>${esc(tool.description)}</p>
      </div>
      <button class="tool-favorite-btn" type="button" data-favorite-tool="${esc(tool.id)}" aria-label="Toggle favorite"><i class="fas fa-star" aria-hidden="true"></i></button>
    `;
    const fav = header.querySelector('.tool-favorite-btn');
    favoriteState(fav, tool.id);
    fav.addEventListener('click', () => toggleFavorite(tool.id));
    return header;
  }

  function ActionBar() {
    const bar = document.createElement('div');
    bar.className = 'tool-action-bar';
    return bar;
  }

  function ResultPanel(tag = 'div') {
    const panel = document.createElement(tag);
    panel.className = 'tool-result-panel';
    return panel;
  }

  function Card(tool, meta = {}) {
    const card = document.createElement('article');
    card.className = 'tool-card glass-card glass-card--content';
    card.dataset.toolId = tool.id;
    card.dataset.toolScope = normalizeScope(meta.tabId || '');
    card.style.setProperty('--tool-card-accent-rgb', accentForTool(tool.id));
    const body = document.createElement('div');
    body.className = 'tool-body';
    card.appendChild(ToolHeader(tool, meta));
    card.appendChild(body);
    return { card, body };
  }

  function matchesFilters(toolId) {
    if (state.favoritesOnly && !state.favorites.has(toolId)) return false;
    const q = (state.search || '').trim().toLowerCase();
    if (!q) return true;
    const meta = toolMeta.get(toolId) || tools.get(toolId);
    if (!meta) return false;
    return `${meta.title} ${meta.description} ${meta.id}`.toLowerCase().includes(q);
  }

  function emptyPanel(msg) {
    state.panelEl.innerHTML = `<div class="tools-empty"><p>${esc(msg)}</p></div>`;
  }

  function filterStatus(total, visible) {
    const el = document.createElement('div');
    el.className = 'tools-filter-status';
    const parts = [`${visible} of ${total} tools`];
    if ((state.search || '').trim()) parts.push(`search: "${state.search.trim()}"`);
    if (state.favoritesOnly) parts.push('favorites only');
    el.textContent = parts.join(' - ');
    return el;
  }

  function allToolMeta() {
    return Array.from(toolMeta.values())
      .filter((meta) => meta && meta.id)
      .sort((a, b) => {
        const tabA = tabs.get(a.tabId);
        const tabB = tabs.get(b.tabId);
        const orderA = tabA ? tabA.order : Number.MAX_SAFE_INTEGER;
        const orderB = tabB ? tabB.order : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return String(a.title || a.id).localeCompare(String(b.title || b.id));
      });
  }

  function filteredToolMeta(list = allToolMeta()) {
    return list.filter((meta) => {
      if (state.activeTab && meta.tabId !== state.activeTab) return false;
      return matchesFilters(meta.id);
    });
  }

  function enableHorizontalWheelScroll(el) {
    if (!el || el.dataset.wheelScroll === 'true') return;
    el.dataset.wheelScroll = 'true';
    el.addEventListener('wheel', (event) => {
      if (!el || el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (!event.deltaY) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    }, { passive: false });
  }

  function setToolButtons() {
    if (!state.tabsEl) return;
    state.tabsEl.querySelectorAll('.tools-tool-nav-btn').forEach((btn) => {
      const active = btn.dataset.toolId === state.activeTool;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
    });
  }

  function buildToolNav(visible, allList) {
    if (!state.tabsEl) return;
    state.tabsEl.innerHTML = '';
    state.tabsEl.setAttribute('role', 'listbox');
    state.tabsEl.setAttribute('aria-label', 'All tools');

    const tabCounts = new Map();
    orderedTabs().forEach((tab) => {
      const count = allList.filter((meta) => meta.tabId === tab.id && matchesFilters(meta.id)).length;
      tabCounts.set(tab.id, count);
    });

    const categories = document.createElement('div');
    categories.className = 'tools-category-row';
    orderedTabs().forEach((tab) => {
      const btn = document.createElement('button');
      const count = tabCounts.get(tab.id) || 0;
      const active = state.activeTab === tab.id;
      btn.type = 'button';
      btn.className = `tools-category-btn${active ? ' active' : ''}`;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.innerHTML = `<i class="fas ${esc(tab.icon || 'fa-layer-group')}" aria-hidden="true"></i><span>${esc(tab.label)}</span><span class="tools-category-count">${count}</span>`;
      btn.addEventListener('click', async () => {
        state.activeTab = tab.id;
        const first = allList.find((meta) => meta.tabId === tab.id && matchesFilters(meta.id));
        state.activeTool = first ? first.id : null;
        await renderWorkspace();
      });
      categories.appendChild(btn);
    });
    if (state.tabPillsEl) {
      state.tabPillsEl.innerHTML = '';
      state.tabPillsEl.appendChild(categories);
    } else {
      state.tabsEl.appendChild(categories);
    }
    enableHorizontalWheelScroll(categories);

    const status = filterStatus(allList.length, visible.length);
    status.classList.add('tools-nav-status');
    state.tabsEl.appendChild(status);

    const list = document.createElement('div');
    list.className = 'tools-nav-list';
    if (!visible.length) {
      list.innerHTML = '<div class="tools-empty"><p>No tools match the current filters.</p></div>';
      state.tabsEl.appendChild(list);
      return;
    }

    visible.forEach((meta) => {
      const tab = tabs.get(meta.tabId);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tools-tool-nav-btn list-item';
      btn.dataset.toolId = meta.id;
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', 'false');
      btn.innerHTML = `
        <span class="tools-tool-nav-main">
          <i class="fas ${esc(meta.icon || 'fa-toolbox')}" aria-hidden="true"></i>
          <span>${esc(meta.title || meta.id)}</span>
        </span>
        <span class="tools-tool-nav-meta">${esc(tab ? tab.label : 'Tool')}</span>
      `;
      btn.addEventListener('click', async () => {
        state.activeTool = meta.id;
        state.activeTab = meta.tabId || null;
        await renderWorkspace();
      });
      list.appendChild(btn);
    });

    state.tabsEl.appendChild(list);
    setToolButtons();

    state.tabsEl.onkeydown = (e) => {
      const buttons = Array.from(state.tabsEl.querySelectorAll('.tools-tool-nav-btn'));
      if (!buttons.length) return;
      const current = document.activeElement;
      const idx = buttons.indexOf(current);
      if (idx < 0) return;
      let next = idx;
      if (e.key === 'ArrowDown') next = (idx + 1) % buttons.length;
      else if (e.key === 'ArrowUp') next = (idx - 1 + buttons.length) % buttons.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = buttons.length - 1;
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        current.click();
        return;
      } else return;
      e.preventDefault();
      buttons[next].focus();
      buttons[next].click();
    };
  }

  async function renderWorkspace(options = {}) {
    const all = allToolMeta();
    const visible = filteredToolMeta(all);
    buildToolNav(visible, all);

    if (!visible.length) {
      clearCleanup();
      emptyPanel('No tools match the current filters.');
      return;
    }

    if (!state.activeTool || !visible.some((meta) => meta.id === state.activeTool)) {
      state.activeTool = visible[0].id;
    }

    const activeMeta = visible.find((meta) => meta.id === state.activeTool) || visible[0];
    if (!activeMeta) {
      clearCleanup();
      emptyPanel('No tool available.');
      return;
    }

    state.activeTool = activeMeta.id;
    state.activeTab = activeMeta.tabId || null;
    setToolButtons();

    if (activeMeta.tabId) await ensureTabLoaded(activeMeta.tabId);
    const tool = tools.get(activeMeta.id);
    if (!tool) {
      clearCleanup();
      emptyPanel('Tool failed to load.');
      return;
    }

    clearCleanup();
    const ctx = mountCtx();
    const activeTab = tabs.get(activeMeta.tabId);
    const { card, body } = Card(tool, {
      tabId: activeMeta.tabId,
      tabLabel: activeTab ? activeTab.label : ''
    });
    const cleanup = tool.mount(body, { ...ctx, toolId: tool.id, tabId: activeMeta.tabId, subtabId: activeMeta.subtabId || null });
    if (typeof cleanup === 'function') state.cleanup.push(cleanup);

    const shell = document.createElement('div');
    shell.className = 'tools-single-shell';
    const statusWrap = document.createElement('div');
    statusWrap.className = 'tools-filter-status-wrap';
    statusWrap.appendChild(filterStatus(all.length, visible.length));
    shell.appendChild(statusWrap);
    shell.appendChild(card);

    state.panelEl.innerHTML = '';
    state.panelEl.appendChild(shell);
    state.panelEl.querySelectorAll('.tools-subtabs').forEach(enableHorizontalWheelScroll);

    if (options.persist !== false) {
      localStorage.setItem(STORAGE.TOOL, state.activeTool);
      if (state.activeTab) localStorage.setItem(STORAGE.TAB, state.activeTab);
    }

    if (options.focusNav) {
      const activeBtn = state.tabsEl.querySelector(`.tools-tool-nav-btn[data-tool-id="${state.activeTool}"]`);
      if (activeBtn) activeBtn.focus();
    }
  }

  async function activateTab(tabId, opts = {}) {
    if (!tabs.has(tabId)) return;
    state.activeTab = tabId;
    const tab = tabs.get(tabId);
    await ensureTabLoaded(tabId);

    const candidates = (tab.tools || []).filter((id) => toolMeta.has(id));
    if (!candidates.length) {
      await renderWorkspace({ persist: opts.persist, focusNav: opts.focusTab });
      return;
    }

    const preferredSub = opts.subtabId || state.subtabByTab[tabId] || localStorage.getItem(`${STORAGE.SUBTAB}${tabId}`);
    const selected = preferredSub
      ? candidates.find((id) => (toolMeta.get(id) || {}).subtabId === preferredSub)
      : null;

    state.activeTool = selected || candidates[0];
    await renderWorkspace({ persist: opts.persist, focusNav: opts.focusTab });
  }

  async function activateSubtab(tabId, subtabId) {
    if (!tabs.has(tabId)) return;
    state.subtabByTab[tabId] = subtabId;
    localStorage.setItem(`${STORAGE.SUBTAB}${tabId}`, subtabId);
    await activateTab(tabId, { subtabId });
  }

  async function openTool(toolId) {
    const meta = toolMeta.get(toolId);
    if (!meta) return;
    if (typeof window.showToolsDashboardView === 'function') window.showToolsDashboardView();
    else if (state.root) state.root.style.display = 'block';

    state.search = '';
    if (state.searchEl) state.searchEl.value = '';
    if (state.favoritesOnly && !state.favorites.has(toolId)) {
      state.favoritesOnly = false;
      if (state.favoritesBtn) {
        state.favoritesBtn.classList.remove('active');
        state.favoritesBtn.setAttribute('aria-pressed', 'false');
      }
    }

    state.activeTool = toolId;
    state.activeTab = meta.tabId || null;
    await renderWorkspace({ focusNav: true });

    const card = state.panelEl.querySelector(`.tool-card[data-tool-id="${toolId}"]`);
    if (!card) return;
    card.classList.add('tool-card-highlight');
    setTimeout(() => card.classList.remove('tool-card-highlight'), 900);
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderFavoritesRow() {
    if (!state.favoritesRow) return;
    const favs = Array.from(state.favorites)
      .map((id) => toolMeta.get(id))
      .filter(Boolean)
      .sort((a, b) => a.title.localeCompare(b.title));

    if (!favs.length) {
      state.favoritesRow.innerHTML = '';
      return;
    }

    state.favoritesRow.innerHTML = `
      <div class="tools-favorites-head"><span>Favorites</span><button type="button" class="tool-chip-btn clear" data-clear-favs>Clear</button></div>
      <div class="tool-chip-row"></div>
    `;

    const row = state.favoritesRow.querySelector('.tool-chip-row');
    favs.forEach((meta) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tool-chip-btn';
      btn.innerHTML = `<i class="fas ${esc(meta.icon)}" aria-hidden="true"></i><span>${esc(meta.title)}</span>`;
      btn.addEventListener('click', () => openTool(meta.id));
      row.appendChild(btn);
    });

    const clear = state.favoritesRow.querySelector('[data-clear-favs]');
    clear.addEventListener('click', () => {
      state.favorites.clear();
      saveFavorites();
      renderFavoritesRow();
      renderWorkspace();
      window.dispatchEvent(new CustomEvent('tools-favorites-changed'));
    });
  }

  function commandItems() {
    const items = [
      {
        id: 'open-tools',
        label: 'Open Tools Dashboard',
        detail: 'Navigation · Alt+5',
        keywords: 'tools dashboard alt+5 shortcut',
        run: () => typeof window.showToolsDashboardView === 'function' && window.showToolsDashboardView()
      },
      {
        id: 'open-homepage',
        label: 'Open Homepage',
        detail: 'Navigation · Alt+1',
        keywords: 'homepage home hub alt+1 shortcut',
        run: () => typeof window.showBlogSectionView === 'function' && window.showBlogSectionView('all', { hubView: 'home', scrollTo: 'home', navTarget: '' })
      },
      {
        id: 'open-projects',
        label: 'Open Projects',
        detail: 'Navigation · Alt+2',
        keywords: 'projects showcase alt+2 shortcut',
        run: () => typeof window.showBlogSectionView === 'function' && window.showBlogSectionView('all', { hubView: 'projects', scrollTo: 'projects', navTarget: 'nav-projects' })
      },
      {
        id: 'open-resources',
        label: 'Open Resources',
        detail: 'Navigation · Alt+3',
        keywords: 'resources docs alt+3 shortcut',
        run: () => typeof window.showBlogSectionView === 'function' && window.showBlogSectionView('all', { hubView: 'resources', scrollTo: 'resources', navTarget: 'nav-resources' })
      },
      {
        id: 'open-posts',
        label: 'Open Posts',
        detail: 'Navigation · Alt+4',
        keywords: 'posts listing alt+4 shortcut',
        run: () => typeof window.showBlogSectionView === 'function' && window.showBlogSectionView('all', { hubView: 'posts', scrollTo: 'posts', navTarget: 'nav-blog' })
      },
      {
        id: 'focus-search',
        label: 'Open Global Search',
        detail: 'Shortcut · Ctrl/Cmd+L',
        keywords: 'search global shortcut',
        run: () => typeof window.openGlobalSearch === 'function' && window.openGlobalSearch('')
      },
      {
        id: 'page-prev',
        label: 'Previous Page',
        detail: 'Shortcut · Alt+←',
        keywords: 'pagination previous page shortcut',
        run: () => window.navigatePagination && window.navigatePagination.prev && window.navigatePagination.prev()
      },
      {
        id: 'page-next',
        label: 'Next Page',
        detail: 'Shortcut · Alt+→',
        keywords: 'pagination next page shortcut',
        run: () => window.navigatePagination && window.navigatePagination.next && window.navigatePagination.next()
      }
    ];

    orderedTabs().forEach((tab) => {
      items.push({
        id: `tab-${tab.id}`,
        label: `Open ${tab.label}`,
        detail: 'Category',
        keywords: `${tab.label} ${tab.description || ''}`,
        run: () => activateTab(tab.id)
      });
    });

    Array.from(toolMeta.values())
      .sort((a, b) => a.title.localeCompare(b.title))
      .forEach((meta) => {
        const tab = tabs.get(meta.tabId);
        items.push({
          id: `tool-${meta.id}`,
          label: meta.title,
          detail: tab ? `${tab.label} Tool` : 'Tool',
          keywords: `${meta.description} ${meta.id}`,
          run: () => openTool(meta.id)
        });
      });

    return items;
  }

  function scoreItem(item, query) {
    if (!query) return 0;
    const text = `${item.label} ${item.detail || ''} ${item.keywords || ''}`.toLowerCase();
    const idx = text.indexOf(query);
    if (idx < 0) return Number.POSITIVE_INFINITY;
    return idx - (item.label.toLowerCase().startsWith(query) ? 20 : 0);
  }

  function setPaletteSelection(index) {
    state.paletteIndex = clamp(index, 0, state.paletteItems.length - 1);
    if (!state.paletteList) return;
    state.paletteList.querySelectorAll('.command-item').forEach((btn, i) => {
      btn.classList.toggle('active', i === state.paletteIndex);
    });
  }

  function renderPalette(query = '') {
    const q = query.trim().toLowerCase();
    state.paletteItems = commandItems()
      .map((item) => ({ item, score: scoreItem(item, q) }))
      .filter((x) => x.score < Number.POSITIVE_INFINITY)
      .sort((a, b) => a.score - b.score)
      .slice(0, 12)
      .map((x) => x.item);
    state.paletteIndex = 0;

    if (!state.paletteItems.length) {
      state.paletteList.innerHTML = '<li class="command-empty">No matching commands.</li>';
      return;
    }

    state.paletteList.innerHTML = state.paletteItems.map((item, i) => `
      <li><button class="command-item ${i === 0 ? 'active' : ''}" type="button" data-index="${i}"><span class="command-label">${esc(item.label)}</span><span class="command-detail">${esc(item.detail || '')}</span></button></li>
    `).join('');

    state.paletteList.querySelectorAll('.command-item').forEach((btn) => {
      btn.addEventListener('mouseenter', () => setPaletteSelection(num(btn.dataset.index, 0)));
      btn.addEventListener('click', () => {
        const item = state.paletteItems[num(btn.dataset.index, 0)];
        if (!item) return;
        closePalette();
        item.run();
      });
    });
  }

  function ensurePalette() {
    if (state.palette) return;
    const wrap = document.createElement('div');
    wrap.className = 'command-palette';
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="command-backdrop" data-close></div>
      <div class="command-dialog" role="dialog" aria-modal="true" aria-labelledby="command-title">
        <div class="command-head"><h3 id="command-title">Command Palette</h3><button type="button" class="command-close" data-close aria-label="Close"><i class="fas fa-xmark" aria-hidden="true"></i></button></div>
        <input class="command-input" data-input type="search" placeholder="Search tools and actions" aria-label="Search commands">
        <p class="command-hint">Enter to run, Esc to close.</p>
        <ul class="command-results" data-list></ul>
      </div>
    `;
    document.body.appendChild(wrap);
    state.palette = wrap;
    state.paletteInput = wrap.querySelector('[data-input]');
    state.paletteList = wrap.querySelector('[data-list]');

    wrap.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closePalette));

    state.paletteInput.addEventListener('input', () => renderPalette(state.paletteInput.value || ''));
    state.paletteInput.addEventListener('keydown', (e) => {
      if (!state.paletteItems.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPaletteSelection((state.paletteIndex + 1) % state.paletteItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPaletteSelection((state.paletteIndex - 1 + state.paletteItems.length) % state.paletteItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = state.paletteItems[state.paletteIndex];
        if (!item) return;
        closePalette();
        item.run();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePalette();
      }
    });
  }

  function openPalette(initial = '') {
    ensurePalette();
    state.palette.hidden = false;
    state.palette.classList.add('open');
    state.paletteInput.value = initial;
    renderPalette(initial);
    state.paletteInput.focus();
    state.paletteInput.select();
  }

  function closePalette() {
    if (!state.palette) return;
    state.palette.classList.remove('open');
    state.palette.hidden = true;
  }

  function hotkeys() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && String(e.key || '').toLowerCase() === 'k') {
        e.preventDefault();
        if (state.palette && !state.palette.hidden) closePalette();
        else openPalette('');
      } else if (e.key === 'Escape' && state.palette && !state.palette.hidden) {
        e.preventDefault();
        closePalette();
      }
    });
  }

  function parseCsv(text, delimiter = ',') {
    const src = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < src.length; i += 1) {
      const ch = src[i];
      if (ch === '"') {
        if (inQuotes && src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else inQuotes = !inQuotes;
        continue;
      }
      if (ch === delimiter && !inQuotes) {
        row.push(cell);
        cell = '';
        continue;
      }
      if (ch === '\n' && !inQuotes) {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        continue;
      }
      cell += ch;
    }
    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows.filter((r) => !(r.length === 1 && r[0] === ''));
  }

  function csvEscape(v, delimiter = ',') {
    const s = v == null ? '' : String(v);
    if (s.includes('"') || s.includes('\n') || s.includes('\r') || s.includes(delimiter)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function jsonToCsv(data, delimiter = ',', headers = true) {
    const rows = Array.isArray(data) ? data : [data];
    if (!rows.length) return '';
    const allObjects = rows.every((row) => row && typeof row === 'object' && !Array.isArray(row));
    if (!allObjects) return rows.map((row) => (Array.isArray(row) ? row.map((x) => csvEscape(x, delimiter)).join(delimiter) : csvEscape(row, delimiter))).join('\n');
    const cols = Array.from(rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set()));
    const lines = rows.map((row) => cols.map((c) => csvEscape(row[c], delimiter)).join(delimiter));
    return headers ? [cols.join(delimiter), ...lines].join('\n') : lines.join('\n');
  }

  function parseLocal(value) {
    const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    return { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5], second: +(m[6] || 0) };
  }

  function localInput(date) {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  }

  const fmtCache = new Map();
  function tzFormatter(tz) {
    if (!fmtCache.has(tz)) {
      fmtCache.set(tz, new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    }
    return fmtCache.get(tz);
  }

  function tzOffsetMs(tz, date) {
    const p = {};
    tzFormatter(tz).formatToParts(date).forEach((part) => {
      if (part.type !== 'literal') p[part.type] = part.value;
    });
    const h = Number(p.hour) % 24;
    const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), h, Number(p.minute), Number(p.second));
    return asUtc - date.getTime();
  }

  function zonedToUtc(parts, tz) {
    let guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0);
    for (let i = 0; i < 4; i += 1) guess -= tzOffsetMs(tz, new Date(guess));
    return new Date(guess);
  }
  function parseColor(input) {
    const value = String(input || '').trim();
    const hex = value.match(/^#?([\da-f]{3}|[\da-f]{6})$/i);
    if (hex) {
      const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    }
    const rgb = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (rgb) return { r: clamp(+rgb[1], 0, 255), g: clamp(+rgb[2], 0, 255), b: clamp(+rgb[3], 0, 255) };
    const hsl = value.match(/^hsl\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/i);
    if (hsl) return hslToRgb(+hsl[1], clamp(+hsl[2], 0, 100), clamp(+hsl[3], 0, 100));
    throw new Error('Unsupported color format');
  }

  function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((n) => clamp(n, 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  }

  function rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d) {
      if (max === rn) h = ((gn - bn) / d) % 6;
      if (max === gn) h = ((bn - rn) / d) + 2;
      if (max === bn) h = ((rn - gn) / d) + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs((2 * l) - 1));
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToRgb(h, s, l) {
    const hue = ((h % 360) + 360) % 360;
    const sat = s / 100;
    const light = l / 100;
    const c = (1 - Math.abs((2 * light) - 1)) * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = light - c / 2;
    let rp = 0;
    let gp = 0;
    let bp = 0;
    if (hue < 60) { rp = c; gp = x; }
    else if (hue < 120) { rp = x; gp = c; }
    else if (hue < 180) { gp = c; bp = x; }
    else if (hue < 240) { gp = x; bp = c; }
    else if (hue < 300) { rp = x; bp = c; }
    else { rp = c; bp = x; }
    return { r: Math.round((rp + m) * 255), g: Math.round((gp + m) * 255), b: Math.round((bp + m) * 255) };
  }

  function parseBig(input, base) {
    const raw = String(input || '').trim().toLowerCase();
    if (!raw) throw new Error('Enter a value first');
    const sign = raw.startsWith('-') ? -1n : 1n;
    let v = raw.replace(/^[-+]/, '');
    if (base === 16 && v.startsWith('0x')) v = v.slice(2);
    if (base === 2 && v.startsWith('0b')) v = v.slice(2);
    const rules = { 2: /^[01]+$/, 10: /^\d+$/, 16: /^[\da-f]+$/ };
    if (!rules[base].test(v)) throw new Error(`Invalid base-${base} input`);
    let out = 0n;
    for (let i = 0; i < v.length; i += 1) out = out * BigInt(base) + BigInt(parseInt(v[i], base));
    return sign < 0n ? -out : out;
  }

  function syllables(word) {
    const w = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 0;
    if (w.length <= 3) return 1;
    const stripped = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    const m = stripped.match(/[aeiouy]{1,2}/g);
    return Math.max(1, m ? m.length : 1);
  }

  function readability(text) {
    const key = text || '';
    if (memo.readability.has(key)) return memo.readability.get(key);
    const words = String(text || '').toLowerCase().match(/\b[\w']+\b/g) || [];
    const sentences = Math.max(1, (String(text || '').match(/[.!?]+/g) || []).length);
    const sy = words.reduce((sum, w) => sum + syllables(w), 0);
    const wc = words.length;
    const wps = wc / sentences;
    const spw = wc ? sy / wc : 0;
    const flesch = wc ? 206.835 - 1.015 * wps - 84.6 * spw : 0;
    const grade = wc ? 0.39 * wps + 11.8 * spw - 15.59 : 0;
    const level = flesch >= 90 ? 'Very Easy' : flesch >= 80 ? 'Easy' : flesch >= 70 ? 'Fairly Easy' : flesch >= 60 ? 'Standard' : flesch >= 50 ? 'Fairly Difficult' : flesch >= 30 ? 'Difficult' : 'Very Confusing';
    const result = { words: wc, sentences, flesch, grade, level };
    memo.readability.set(key, result);
    if (memo.readability.size > 120) memo.readability.delete(memo.readability.keys().next().value);
    return result;
  }

  function frequency(text, limit) {
    const lim = clamp(num(limit, 20), 1, 100);
    const key = `${text || ''}::${lim}`;
    if (memo.word.has(key)) return memo.word.get(key);
    const stop = new Set(['the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'your', 'will', 'would', 'there', 'about', 'could', 'should']);
    const counts = new Map();
    (String(text || '').toLowerCase().match(/\b[\w']+\b/g) || []).forEach((token) => {
      const t = token.replace(/^'+|'+$/g, '');
      if (!t || t.length < 2 || stop.has(t)) return;
      counts.set(t, (counts.get(t) || 0) + 1);
    });
    const rows = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, lim).map(([word, count]) => ({ word, count }));
    memo.word.set(key, rows);
    if (memo.word.size > 120) memo.word.delete(memo.word.keys().next().value);
    return rows;
  }

  function mountCsvJson(el, ctx) {
    el.innerHTML = `
      <div class="tool-grid three"><label class="tool-field"><span class="tool-label">Mode</span><select class="tool-select" data-mode><option value="csv-json">CSV to JSON</option><option value="json-csv">JSON to CSV</option></select></label><label class="tool-field"><span class="tool-label">Delimiter</span><input class="tool-input" data-delim type="text" value="," maxlength="1"></label><label class="tool-field inline"><input data-head type="checkbox" checked><span>First row headers</span></label></div>
      <label class="tool-field"><span class="tool-label">Input</span><textarea class="tool-textarea" data-in></textarea></label>
      <div class="tool-action-row" data-actions></div>
      <label class="tool-field"><span class="tool-label">Output</span><textarea class="tool-textarea" data-out readonly></textarea></label>
      <p class="tool-status" data-status>Ready.</p>
    `;
    const mode = el.querySelector('[data-mode]');
    const delim = el.querySelector('[data-delim]');
    const head = el.querySelector('[data-head]');
    const input = el.querySelector('[data-in]');
    const output = el.querySelector('[data-out]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" type="button" data-run>Convert</button><button class="tool-btn-secondary" type="button" data-swap>Swap</button><button class="tool-btn-secondary" type="button" data-copy>Copy</button><button class="tool-btn-secondary" type="button" data-clear>Clear</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const convert = async () => {
      try {
        const text = input.value || '';
        if (!text.trim()) throw new Error('Enter input first');
        if (mode.value === 'csv-json') {
          const rows = parseCsv(text, delim.value || ',');
          const data = head.checked ? rows.slice(1).map((r) => rows[0].reduce((acc, key, i) => ((acc[key] = r[i] || ''), acc), {})) : rows;
          const raw = JSON.stringify(data);
          const cacheKey = `${raw.length}:${raw.slice(0, 256)}`;
          if (memo.json.has(cacheKey)) output.value = memo.json.get(cacheKey);
          else {
            const formatted = raw.length > 8000 ? await ctx.workerOr('json-format', { input: raw, indent: 2 }, ctx.jsonMain) : ctx.jsonMain({ input: raw, indent: 2 });
            output.value = formatted.formatted;
            memo.json.set(cacheKey, formatted.formatted);
          }
        } else {
          output.value = jsonToCsv(JSON.parse(text), delim.value || ',', head.checked);
        }
        status.textContent = 'Converted.';
        status.classList.remove('error');
      } catch (e) {
        status.textContent = e.message;
        status.classList.add('error');
      }
    };

    bar.querySelector('[data-run]').addEventListener('click', convert);
    bar.querySelector('[data-swap]').addEventListener('click', () => {
      const m = mode.value;
      mode.value = m === 'csv-json' ? 'json-csv' : 'csv-json';
      const t = input.value;
      input.value = output.value;
      output.value = t;
    });
    bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(output.value || '')) ? 'Copied' : 'Copy failed'));
    bar.querySelector('[data-clear]').addEventListener('click', () => {
      input.value = '';
      output.value = '';
      status.textContent = 'Cleared.';
      status.classList.remove('error');
    });
  }

  function mountUuid(el, ctx) {
    el.innerHTML = '<div class="tool-grid two"><label class="tool-field"><span class="tool-label">Count</span><input class="tool-input" data-count type="number" min="1" max="100" value="5"></label><label class="tool-field inline"><input data-upper type="checkbox"><span>Uppercase</span></label></div><div class="tool-action-row" data-actions></div><textarea class="tool-textarea" data-out readonly></textarea><p class="tool-status" data-status>Ready.</p>';
    const count = el.querySelector('[data-count]');
    const upper = el.querySelector('[data-upper]');
    let out = el.querySelector('[data-out]');
    const outPanel = ResultPanel('div');
    outPanel.classList.add('tool-diff-output');
    outPanel.setAttribute('data-out', '');
    out.replaceWith(outPanel);
    out = outPanel;
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" type="button" data-run>Generate</button><button class="tool-btn-secondary" type="button" data-copy>Copy</button>';
    el.querySelector('[data-actions]').appendChild(bar);
    const uuid = () => {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
      const bytes = new Uint8Array(16);
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
      else for (let i = 0; i < bytes.length; i += 1) bytes[i] = randomInt(256);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const h = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    };
    const run = () => {
      const n = clamp(num(count.value, 5), 1, 100);
      const list = Array.from({ length: n }, () => (upper.checked ? uuid().toUpperCase() : uuid()));
      out.textContent = list.join('\n');
    };
    bar.querySelector('[data-run]').addEventListener('click', run);
    bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.textContent || '')) ? 'Copied' : 'Copy failed'));
    run();
  }
  function mountUnixTime(el) {
    const now = new Date();
    el.innerHTML = `<div class="tool-grid three"><label class="tool-field"><span class="tool-label">Timestamp</span><input class="tool-input" data-ts type="number" value="${Math.floor(now.getTime() / 1000)}"></label><label class="tool-field"><span class="tool-label">Unit</span><select class="tool-select" data-unit><option value="s" selected>Seconds</option><option value="ms">Milliseconds</option></select></label><label class="tool-field"><span class="tool-label">Date</span><input class="tool-input" data-date type="datetime-local" value="${localInput(now)}"></label></div><div class="tool-action-row" data-actions></div><div class="tool-kv"><div><span>UTC</span><strong data-utc>-</strong></div><div><span>Local</span><strong data-local>-</strong></div><div><span>ISO</span><strong data-iso>-</strong></div></div><p class="tool-status" data-status>Ready.</p>`;
    const ts = el.querySelector('[data-ts]');
    const unit = el.querySelector('[data-unit]');
    const date = el.querySelector('[data-date]');
    const utc = el.querySelector('[data-utc]');
    const local = el.querySelector('[data-local]');
    const iso = el.querySelector('[data-iso]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-from-ts type="button">From Timestamp</button><button class="tool-btn-secondary" data-from-date type="button">From Date</button><button class="tool-btn-secondary" data-now type="button">Now</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const render = (d) => {
      if (Number.isNaN(d.getTime())) {
        status.textContent = 'Invalid date';
        status.classList.add('error');
        return;
      }
      status.textContent = 'Converted.';
      status.classList.remove('error');
      utc.textContent = d.toUTCString();
      local.textContent = d.toLocaleString();
      iso.textContent = d.toISOString();
      date.value = localInput(d);
    };

    const fromTs = () => {
      const raw = num(ts.value, NaN);
      if (!Number.isFinite(raw)) {
        status.textContent = 'Enter valid timestamp';
        status.classList.add('error');
        return;
      }
      render(new Date(unit.value === 's' ? raw * 1000 : raw));
    };

    const fromDate = () => {
      const d = new Date(date.value);
      if (Number.isNaN(d.getTime())) {
        status.textContent = 'Enter valid date';
        status.classList.add('error');
        return;
      }
      const ms = d.getTime();
      ts.value = unit.value === 's' ? String(Math.floor(ms / 1000)) : String(ms);
      render(d);
    };

    bar.querySelector('[data-from-ts]').addEventListener('click', fromTs);
    bar.querySelector('[data-from-date]').addEventListener('click', fromDate);
    bar.querySelector('[data-now]').addEventListener('click', () => {
      const d = new Date();
      ts.value = unit.value === 's' ? String(Math.floor(d.getTime() / 1000)) : String(d.getTime());
      render(d);
    });
    fromTs();
  }

  function mountColor(el) {
    el.innerHTML = '<label class="tool-field"><span class="tool-label">Color (HEX/RGB/HSL)</span><input class="tool-input" data-in type="text" value="#4A90E2"></label><div class="tool-action-row" data-actions></div><div class="tool-color-preview" data-preview></div><div class="tool-grid three"><label class="tool-field"><span class="tool-label">HEX</span><input class="tool-input" data-hex readonly></label><label class="tool-field"><span class="tool-label">RGB</span><input class="tool-input" data-rgb readonly></label><label class="tool-field"><span class="tool-label">HSL</span><input class="tool-input" data-hsl readonly></label></div><p class="tool-status" data-status>Ready.</p>';
    const input = el.querySelector('[data-in]');
    const hex = el.querySelector('[data-hex]');
    const rgb = el.querySelector('[data-rgb]');
    const hsl = el.querySelector('[data-hsl]');
    const preview = el.querySelector('[data-preview]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" type="button" data-run>Convert</button>';
    el.querySelector('[data-actions]').appendChild(bar);
    const run = () => {
      try {
        const c = parseColor(input.value);
        const hs = rgbToHsl(c.r, c.g, c.b);
        const hx = rgbToHex(c.r, c.g, c.b);
        hex.value = hx;
        rgb.value = `rgb(${c.r}, ${c.g}, ${c.b})`;
        hsl.value = `hsl(${hs.h}, ${hs.s}%, ${hs.l}%)`;
        preview.style.background = hx;
        status.textContent = 'Converted.';
        status.classList.remove('error');
      } catch (e) {
        status.textContent = e.message;
        status.classList.add('error');
      }
    };
    bar.querySelector('[data-run]').addEventListener('click', run);
    run();
  }

  function mountBase(el) {
    el.innerHTML = '<div class="tool-grid two"><label class="tool-field"><span class="tool-label">Input</span><input class="tool-input" data-val type="text"></label><label class="tool-field"><span class="tool-label">Base</span><select class="tool-select" data-base><option value="2">Binary</option><option value="10" selected>Decimal</option><option value="16">Hex</option></select></label></div><div class="tool-action-row" data-actions></div><div class="tool-grid three"><label class="tool-field"><span class="tool-label">Binary</span><input class="tool-input" data-b readonly></label><label class="tool-field"><span class="tool-label">Decimal</span><input class="tool-input" data-d readonly></label><label class="tool-field"><span class="tool-label">Hex</span><input class="tool-input" data-h readonly></label></div><p class="tool-status" data-status>Ready.</p>';
    const v = el.querySelector('[data-val]');
    const base = el.querySelector('[data-base]');
    const b = el.querySelector('[data-b]');
    const d = el.querySelector('[data-d]');
    const h = el.querySelector('[data-h]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Convert</button>';
    el.querySelector('[data-actions]').appendChild(bar);
    bar.querySelector('[data-run]').addEventListener('click', () => {
      try {
        const x = parseBig(v.value, num(base.value, 10));
        b.value = x.toString(2);
        d.value = x.toString(10);
        h.value = x.toString(16).toUpperCase();
        status.textContent = 'Converted.';
        status.classList.remove('error');
      } catch (e) {
        status.textContent = e.message;
        status.classList.add('error');
      }
    });
  }

  function mountMarkdown(el, ctx) {
    el.innerHTML = '<label class="tool-field"><span class="tool-label">Markdown</span><textarea class="tool-textarea" data-in># Markdown Preview\n\nType here...</textarea></label><div class="tool-meta"><span data-count>0 words</span></div><div class="tool-markdown-preview" data-out></div><p class="tool-status" data-status>Live preview (300ms).</p>';
    const input = el.querySelector('[data-in]');
    const out = el.querySelector('[data-out]');
    const count = el.querySelector('[data-count]');
    const status = el.querySelector('[data-status]');
    const md = window.markdownit ? window.markdownit({ linkify: true, breaks: true, html: false }) : null;
    if (md && window.markdownitFootnote) md.use(window.markdownitFootnote);
    if (md && window.markdownitKatex) md.use(window.markdownitKatex);
    const run = () => {
      const text = input.value || '';
      const words = text.match(/\b[\w']+\b/g) || [];
      count.textContent = `${words.length} word${words.length === 1 ? '' : 's'}`;
      if (md) {
        out.innerHTML = md.render(text);
        status.textContent = 'Rendered with markdown-it.';
      } else {
        out.textContent = text;
        status.textContent = 'markdown-it unavailable; plain text shown.';
      }
    };
    input.addEventListener('input', ctx.debounce(run));
    run();
  }

  function mountDiff(el, ctx) {
    el.innerHTML = '<div class="tool-grid two"><label class="tool-field"><span class="tool-label">Original</span><textarea class="tool-textarea" data-a></textarea></label><label class="tool-field"><span class="tool-label">Updated</span><textarea class="tool-textarea" data-b></textarea></label></div><div class="tool-action-row" data-actions></div><div class="tool-diff-stats" data-stats><span>Added: 0</span><span>Removed: 0</span><span>Unchanged: 0</span></div><div class="tool-diff-output" data-out></div><p class="tool-status" data-status>Edit either side to compare.</p>';
    const a = el.querySelector('[data-a]');
    const b = el.querySelector('[data-b]');
    const stats = el.querySelector('[data-stats]');
    const out = el.querySelector('[data-out]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Compare</button><button class="tool-btn-secondary" data-swap type="button">Swap</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const run = async () => {
      try {
        status.textContent = 'Computing diff...';
        status.classList.remove('error');
        const key = `${a.value.length}:${b.value.length}:${a.value.slice(0, 120)}:${b.value.slice(0, 120)}`;
        let result = memo.diff.get(key);
        if (!result) {
          result = await ctx.workerOr('text-diff', { left: a.value || '', right: b.value || '' }, ctx.diffMain);
          memo.diff.set(key, result);
          if (memo.diff.size > 80) memo.diff.delete(memo.diff.keys().next().value);
        }
        const lines = result.lines || [];
        const s = result.stats || { added: 0, removed: 0, context: 0 };
        stats.innerHTML = `<span>Added: ${s.added}</span><span>Removed: ${s.removed}</span><span>Unchanged: ${s.context}</span>`;
        out.innerHTML = '';
        const frag = document.createDocumentFragment();
        lines.slice(0, 1600).forEach((line) => {
          const row = document.createElement('div');
          row.className = `diff-line ${line.type}`;
          const p = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
          row.textContent = `${p} ${line.text}`;
          frag.appendChild(row);
        });
        if (lines.length > 1600) {
          const note = document.createElement('div');
          note.className = 'diff-line context';
          note.textContent = `... ${lines.length - 1600} additional lines omitted`;
          frag.appendChild(note);
        }
        out.appendChild(frag);
        status.textContent = `Diff complete (${lines.length} lines).`;
      } catch (e) {
        status.textContent = e.message;
        status.classList.add('error');
      }
    };

    const debounced = ctx.debounce(run);
    a.addEventListener('input', debounced);
    b.addEventListener('input', debounced);
    bar.querySelector('[data-run]').addEventListener('click', run);
    bar.querySelector('[data-swap]').addEventListener('click', () => {
      const t = a.value;
      a.value = b.value;
      b.value = t;
      run();
    });
  }
  function mountWordFreq(el, ctx) {
    el.innerHTML = '<label class="tool-field"><span class="tool-label">Text</span><textarea class="tool-textarea" data-in></textarea></label><div class="tool-grid two"><label class="tool-field"><span class="tool-label">Top N</span><input class="tool-input" data-limit type="number" min="1" max="100" value="20"></label><div class="tool-action-row" data-actions></div></div><div class="tool-table-wrap"><table class="tool-table"><thead><tr><th>Word</th><th>Count</th></tr></thead><tbody data-body></tbody></table></div><p class="tool-status" data-status>Ready.</p>';
    const input = el.querySelector('[data-in]');
    const limit = el.querySelector('[data-limit]');
    const body = el.querySelector('[data-body]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Analyze</button>';
    el.querySelector('[data-actions]').appendChild(bar);
    const run = () => {
      const rows = frequency(input.value || '', limit.value);
      body.innerHTML = rows.map((r) => `<tr><td>${esc(r.word)}</td><td>${r.count}</td></tr>`).join('');
      status.textContent = rows.length ? `Found ${rows.length} ranked words.` : 'No words found.';
      status.classList.remove('error');
    };
    input.addEventListener('input', ctx.debounce(run));
    limit.addEventListener('input', ctx.debounce(run));
    bar.querySelector('[data-run]').addEventListener('click', run);
  }

  function mountReadability(el, ctx) {
    el.innerHTML = '<label class="tool-field"><span class="tool-label">Text</span><textarea class="tool-textarea" data-in></textarea></label><div class="tool-action-row" data-actions></div><div class="tool-kv"><div><span>Words</span><strong data-words>0</strong></div><div><span>Sentences</span><strong data-sentences>0</strong></div><div><span>Flesch</span><strong data-flesch>0</strong></div><div><span>Grade</span><strong data-grade>0</strong></div></div><p class="tool-status" data-status>Ready.</p>';
    const input = el.querySelector('[data-in]');
    const words = el.querySelector('[data-words]');
    const sentences = el.querySelector('[data-sentences]');
    const flesch = el.querySelector('[data-flesch]');
    const grade = el.querySelector('[data-grade]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Analyze</button>';
    el.querySelector('[data-actions]').appendChild(bar);
    const run = () => {
      const r = readability(input.value || '');
      words.textContent = String(r.words);
      sentences.textContent = String(r.sentences);
      flesch.textContent = r.flesch.toFixed(1);
      grade.textContent = r.grade.toFixed(1);
      status.textContent = `Reading level: ${r.level}`;
      status.classList.remove('error');
    };
    input.addEventListener('input', ctx.debounce(run));
    bar.querySelector('[data-run]').addEventListener('click', run);
  }

  function mountPomodoro(el) {
    el.innerHTML = '<div class="tool-grid two"><label class="tool-field"><span class="tool-label">Work (minutes)</span><input class="tool-input" data-work type="number" min="1" max="120" value="25"></label><label class="tool-field"><span class="tool-label">Break (minutes)</span><input class="tool-input" data-break type="number" min="1" max="60" value="5"></label></div><div class="pomodoro-clock" data-clock>25:00</div><p class="pomodoro-phase" data-phase>Work session</p><div class="tool-action-row" data-actions></div><p class="tool-status" data-status>Completed cycles: <strong data-cycles>0</strong></p>';
    const work = el.querySelector('[data-work]');
    const brk = el.querySelector('[data-break]');
    const clock = el.querySelector('[data-clock]');
    const phase = el.querySelector('[data-phase]');
    const cycles = el.querySelector('[data-cycles]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-start type="button">Start</button><button class="tool-btn-secondary" data-pause type="button">Pause</button><button class="tool-btn-secondary" data-skip type="button">Skip</button><button class="tool-btn-secondary" data-reset type="button">Reset</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const s = { phase: 'work', rem: 25 * 60, run: false, done: 0, timer: null };
    const show = () => {
      const m = String(Math.floor(s.rem / 60)).padStart(2, '0');
      const sec = String(Math.floor(s.rem % 60)).padStart(2, '0');
      clock.textContent = `${m}:${sec}`;
      phase.textContent = s.phase === 'work' ? 'Work session' : 'Break session';
      cycles.textContent = String(s.done);
      clock.classList.toggle('break', s.phase === 'break');
    };
    const stop = () => {
      s.run = false;
      if (s.timer) {
        clearInterval(s.timer);
        s.timer = null;
      }
    };
    const swap = () => {
      const w = clamp(num(work.value, 25), 1, 120);
      const b = clamp(num(brk.value, 5), 1, 60);
      if (s.phase === 'work') {
        s.phase = 'break';
        s.rem = b * 60;
        s.done += 1;
      } else {
        s.phase = 'work';
        s.rem = w * 60;
      }
      show();
    };
    const tick = () => {
      if (!s.run) return;
      s.rem -= 1;
      if (s.rem <= 0) swap();
      show();
    };

    bar.querySelector('[data-start]').addEventListener('click', () => {
      if (s.run) return;
      s.run = true;
      s.timer = setInterval(tick, 1000);
    });
    bar.querySelector('[data-pause]').addEventListener('click', stop);
    bar.querySelector('[data-skip]').addEventListener('click', swap);
    bar.querySelector('[data-reset]').addEventListener('click', () => {
      stop();
      s.phase = 'work';
      s.done = 0;
      s.rem = clamp(num(work.value, 25), 1, 120) * 60;
      show();
    });
    [work, brk].forEach((input) => input.addEventListener('input', () => {
      if (!s.run) {
        s.rem = (s.phase === 'work' ? clamp(num(work.value, 25), 1, 120) : clamp(num(brk.value, 5), 1, 60)) * 60;
        show();
      }
    }));
    show();
    return () => stop();
  }

  function mountTimezone(el) {
    const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'];
    const now = new Date();
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    el.innerHTML = `<div class="tool-grid three"><label class="tool-field"><span class="tool-label">Date & Time</span><input class="tool-input" data-date type="datetime-local" value="${localInput(now)}"></label><label class="tool-field"><span class="tool-label">From</span><select class="tool-select" data-from></select></label><label class="tool-field"><span class="tool-label">To</span><select class="tool-select" data-to></select></label></div><div class="tool-action-row" data-actions></div><div class="tool-kv"><div><span>From</span><strong data-from-out>-</strong></div><div><span>To</span><strong data-to-out>-</strong></div><div><span>UTC</span><strong data-utc-out>-</strong></div></div><p class="tool-status" data-status>Ready.</p>`;
    const date = el.querySelector('[data-date]');
    const from = el.querySelector('[data-from]');
    const to = el.querySelector('[data-to]');
    const fromOut = el.querySelector('[data-from-out]');
    const toOut = el.querySelector('[data-to-out]');
    const utcOut = el.querySelector('[data-utc-out]');
    const status = el.querySelector('[data-status]');
    const opts = zones.map((z) => `<option value="${esc(z)}">${esc(z)}</option>`).join('');
    from.innerHTML = opts;
    to.innerHTML = opts;
    if (zones.includes(localTz)) from.value = localTz;
    to.value = 'UTC';
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Convert</button><button class="tool-btn-secondary" data-swap type="button">Swap</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const run = () => {
      try {
        const parts = parseLocal(date.value);
        if (!parts) throw new Error('Enter a valid date/time');
        const utcDate = zonedToUtc(parts, from.value);
        fromOut.textContent = new Intl.DateTimeFormat('en-US', { timeZone: from.value, dateStyle: 'full', timeStyle: 'medium' }).format(utcDate);
        toOut.textContent = new Intl.DateTimeFormat('en-US', { timeZone: to.value, dateStyle: 'full', timeStyle: 'medium' }).format(utcDate);
        utcOut.textContent = utcDate.toISOString();
        status.textContent = 'Converted.';
        status.classList.remove('error');
      } catch (e) {
        status.textContent = e.message;
        status.classList.add('error');
      }
    };

    bar.querySelector('[data-run]').addEventListener('click', run);
    bar.querySelector('[data-swap]').addEventListener('click', () => {
      const t = from.value;
      from.value = to.value;
      to.value = t;
      run();
    });
    [date, from, to].forEach((x) => x.addEventListener('input', run));
    run();
  }

  function mountRandomPicker(el) {
    el.innerHTML = '<label class="tool-field"><span class="tool-label">Choices (comma or newline)</span><textarea class="tool-textarea" data-items></textarea></label><div class="tool-grid two"><label class="tool-field"><span class="tool-label">Pick Count</span><input class="tool-input" data-count type="number" min="1" max="50" value="1"></label><label class="tool-field inline"><input data-unique type="checkbox" checked><span>No duplicates</span></label></div><div class="tool-action-row" data-actions></div><div class="tool-chip-row" data-out></div><p class="tool-status" data-status>Ready.</p>';
    const items = el.querySelector('[data-items]');
    const count = el.querySelector('[data-count]');
    const unique = el.querySelector('[data-unique]');
    const out = el.querySelector('[data-out]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Pick</button>';
    el.querySelector('[data-actions]').appendChild(bar);
    bar.querySelector('[data-run]').addEventListener('click', () => {
      const pool = String(items.value || '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      const want = clamp(num(count.value, 1), 1, 50);
      if (!pool.length) {
        status.textContent = 'Add at least one option.';
        status.classList.add('error');
        out.innerHTML = '';
        return;
      }
      const picks = [];
      const bag = pool.slice();
      const max = unique.checked ? Math.min(want, bag.length) : want;
      for (let i = 0; i < max; i += 1) {
        if (!bag.length) break;
        const idx = randomInt(bag.length);
        picks.push(bag[idx]);
        if (unique.checked) bag.splice(idx, 1);
      }
      out.innerHTML = picks.map((x) => `<span class="tool-pill">${esc(x)}</span>`).join('');
      status.textContent = `Picked ${picks.length} item${picks.length === 1 ? '' : 's'}.`;
      status.classList.remove('error');
    });
  }
  function ensureZxcvbn() {
    if (window.zxcvbn) return Promise.resolve(window.zxcvbn);
    if (zxcvbnLoad) return zxcvbnLoad;
    zxcvbnLoad = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/zxcvbn@4.4.2/dist/zxcvbn.js';
      s.async = true;
      s.onload = () => (window.zxcvbn ? resolve(window.zxcvbn) : reject(new Error('zxcvbn unavailable')));
      s.onerror = () => reject(new Error('Failed to load zxcvbn'));
      document.head.appendChild(s);
    });
    return zxcvbnLoad;
  }

  function mountPasswordStrength(el, ctx) {
    el.innerHTML = '<label class="tool-field"><span class="tool-label">Password</span><input class="tool-input" data-pass type="text"></label><div class="strength-meter"><div class="strength-meter-bar" data-bar></div></div><div class="tool-kv"><div><span>Score</span><strong data-score>-</strong></div><div><span>Crack Time</span><strong data-time>-</strong></div></div><p class="tool-status" data-status>Loading zxcvbn on first run.</p>';
    const pass = el.querySelector('[data-pass]');
    const bar = el.querySelector('[data-bar]');
    const score = el.querySelector('[data-score]');
    const time = el.querySelector('[data-time]');
    const status = el.querySelector('[data-status]');
    let token = 0;

    const run = async () => {
      const id = ++token;
      const value = pass.value || '';
      if (!value) {
        bar.style.width = '0%';
        score.textContent = '-';
        time.textContent = '-';
        status.textContent = 'Enter a password to analyze.';
        status.classList.remove('error');
        return;
      }
      try {
        const z = await ensureZxcvbn();
        if (id !== token) return;
        const r = z(value);
        const s = clamp(r.score, 0, 4);
        bar.style.width = `${((s + 1) / 5) * 100}%`;
        score.textContent = `${s}/4`;
        time.textContent = r.crack_times_display.offline_fast_hashing_1e10_per_second || 'N/A';
        const feedback = [r.feedback.warning || '', ...(r.feedback.suggestions || [])].filter(Boolean).join(' ').trim();
        status.textContent = feedback || 'No critical issues found.';
        status.classList.remove('error');
      } catch {
        if (id !== token) return;
        const rough = clamp(Math.floor((value.length / 3) + (/\d/.test(value) ? 1 : 0) + (/[^\w]/.test(value) ? 1 : 0)), 0, 4);
        bar.style.width = `${((rough + 1) / 5) * 100}%`;
        score.textContent = `${rough}/4`;
        time.textContent = 'Unavailable';
        status.textContent = 'zxcvbn load failed, using fallback heuristic.';
        status.classList.add('error');
      }
    };
    pass.addEventListener('input', ctx.debounce(run));
  }

  function mountJwt(el, ctx) {
    el.innerHTML = `<div class="tool-grid two"><label class="tool-field"><span class="tool-label">Header JSON</span><textarea class="tool-textarea" data-head>{"alg":"HS256","typ":"JWT"}</textarea></label><label class="tool-field"><span class="tool-label">Payload JSON</span><textarea class="tool-textarea" data-payload>{"sub":"1234567890","name":"Nomu","iat":${Math.floor(Date.now() / 1000)}}</textarea></label></div><div class="tool-grid two"><label class="tool-field"><span class="tool-label">Algorithm</span><select class="tool-select" data-alg><option value="HS256" selected>HS256</option><option value="HS384">HS384</option><option value="HS512">HS512</option><option value="none">none</option></select></label><label class="tool-field"><span class="tool-label">Secret</span><input class="tool-input" data-secret type="text" placeholder="Required unless alg=none"></label></div><div class="tool-action-row" data-actions></div><label class="tool-field"><span class="tool-label">JWT</span><textarea class="tool-textarea" data-out readonly></textarea></label><p class="tool-status" data-status>Ready.</p>`;
    const head = el.querySelector('[data-head]');
    const payload = el.querySelector('[data-payload]');
    const alg = el.querySelector('[data-alg]');
    const secret = el.querySelector('[data-secret]');
    const out = el.querySelector('[data-out]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Encode</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const run = async () => {
      try {
        const h = JSON.parse(head.value || '{}');
        const p = JSON.parse(payload.value || '{}');
        const a = alg.value;
        h.alg = a;
        if (!h.typ) h.typ = 'JWT';
        const unsigned = `${ctx.textToB64url(JSON.stringify(h))}.${ctx.textToB64url(JSON.stringify(p))}`;
        let sig = '';
        if (a !== 'none') {
          if (!secret.value) throw new Error('Secret is required for signed JWT');
          const hash = a === 'HS384' ? 'SHA-384' : a === 'HS512' ? 'SHA-512' : 'SHA-256';
          const result = await ctx.workerOr('hmac', { text: unsigned, secret: secret.value, algorithm: hash, output: 'base64url' }, ctx.hmacMain);
          sig = result.digest;
        }
        out.value = sig ? `${unsigned}.${sig}` : `${unsigned}.`;
        status.textContent = 'JWT encoded.';
        status.classList.remove('error');
      } catch (e) {
        status.textContent = e.message;
        status.classList.add('error');
      }
    };

    bar.querySelector('[data-run]').addEventListener('click', run);
    bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
  }

  function mountHmac(el, ctx) {
    el.innerHTML = '<label class="tool-field"><span class="tool-label">Message</span><textarea class="tool-textarea" data-msg></textarea></label><div class="tool-grid three"><label class="tool-field"><span class="tool-label">Secret</span><input class="tool-input" data-secret type="text"></label><label class="tool-field"><span class="tool-label">Algorithm</span><select class="tool-select" data-alg><option value="SHA-256" selected>HMAC-SHA-256</option><option value="SHA-384">HMAC-SHA-384</option><option value="SHA-512">HMAC-SHA-512</option></select></label><label class="tool-field"><span class="tool-label">Output</span><select class="tool-select" data-outfmt><option value="hex" selected>Hex</option><option value="base64">Base64</option><option value="base64url">Base64 URL</option></select></label></div><div class="tool-action-row" data-actions></div><textarea class="tool-textarea" data-out readonly></textarea><p class="tool-status" data-status>Ready.</p>';
    const msg = el.querySelector('[data-msg]');
    const secret = el.querySelector('[data-secret]');
    const alg = el.querySelector('[data-alg]');
    const outfmt = el.querySelector('[data-outfmt]');
    const out = el.querySelector('[data-out]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Generate</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
    el.querySelector('[data-actions]').appendChild(bar);
    bar.querySelector('[data-run]').addEventListener('click', async () => {
      if (!secret.value) {
        status.textContent = 'Secret is required.';
        status.classList.add('error');
        return;
      }
      try {
        const result = await ctx.workerOr('hmac', { text: msg.value || '', secret: secret.value, algorithm: alg.value, output: outfmt.value }, ctx.hmacMain);
        out.value = result.digest;
        status.textContent = 'HMAC generated.';
        status.classList.remove('error');
      } catch (e) {
        status.textContent = e.message;
        status.classList.add('error');
      }
    });
    bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
  }

  function mountHashCompare(el, ctx) {
    el.innerHTML = '<div class="tool-grid two"><label class="tool-field"><span class="tool-label">Input A</span><textarea class="tool-textarea" data-a></textarea></label><label class="tool-field"><span class="tool-label">Input B</span><textarea class="tool-textarea" data-b></textarea></label></div><div class="tool-grid two"><label class="tool-field"><span class="tool-label">Algorithm</span><select class="tool-select" data-alg><option value="SHA-256" selected>SHA-256</option><option value="SHA-384">SHA-384</option><option value="SHA-512">SHA-512</option><option value="SHA-1">SHA-1</option></select></label><div class="tool-action-row" data-actions></div></div><label class="tool-field"><span class="tool-label">Hash A</span><input class="tool-input" data-ha readonly></label><label class="tool-field"><span class="tool-label">Hash B</span><input class="tool-input" data-hb readonly></label><p class="tool-status" data-status>Ready.</p>';
    const a = el.querySelector('[data-a]');
    const b = el.querySelector('[data-b]');
    const alg = el.querySelector('[data-alg]');
    const ha = el.querySelector('[data-ha]');
    const hb = el.querySelector('[data-hb]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Compare</button>';
    el.querySelector('[data-actions]').appendChild(bar);
    bar.querySelector('[data-run]').addEventListener('click', async () => {
      try {
        const result = await ctx.workerOr('hash-compare', { left: a.value || '', right: b.value || '', algorithm: alg.value }, async (payload) => {
          const [lh, rh] = await Promise.all([
            ctx.hashMain({ text: payload.left, algorithm: payload.algorithm, output: 'hex' }),
            ctx.hashMain({ text: payload.right, algorithm: payload.algorithm, output: 'hex' })
          ]);
          return { leftHash: lh.digest, rightHash: rh.digest, match: lh.digest === rh.digest };
        });
        ha.value = result.leftHash;
        hb.value = result.rightHash;
        status.textContent = result.match ? 'Hashes match.' : 'Hashes differ.';
        status.classList.toggle('error', !result.match);
        status.classList.toggle('success', !!result.match);
      } catch (e) {
        status.textContent = e.message;
        status.classList.add('error');
      }
    });
  }

  function mountUrlEncoder(el, ctx) {
    el.innerHTML = '<div class="tool-grid three"><label class="tool-field"><span class="tool-label">Mode</span><select class="tool-select" data-mode><option value="encode" selected>Encode</option><option value="decode">Decode</option></select></label><label class="tool-field"><span class="tool-label">Scope</span><select class="tool-select" data-scope><option value="component" selected>URIComponent</option><option value="uri">URI</option></select></label><div class="tool-action-row" data-actions></div></div><label class="tool-field"><span class="tool-label">Input</span><textarea class="tool-textarea" data-in></textarea></label><label class="tool-field"><span class="tool-label">Output</span><textarea class="tool-textarea" data-out readonly></textarea></label><p class="tool-status" data-status>Ready.</p>';
    const mode = el.querySelector('[data-mode]');
    const scope = el.querySelector('[data-scope]');
    const input = el.querySelector('[data-in]');
    const output = el.querySelector('[data-out]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Run</button><button class="tool-btn-secondary" data-swap type="button">Swap</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const run = () => {
      try {
        const source = input.value || '';
        const isUri = scope.value === 'uri';
        output.value = mode.value === 'encode'
          ? (isUri ? encodeURI(source) : encodeURIComponent(source))
          : (isUri ? decodeURI(source) : decodeURIComponent(source));
        status.textContent = 'Converted.';
        status.classList.remove('error');
      } catch (e) {
        status.textContent = e.message || 'Conversion failed';
        status.classList.add('error');
      }
    };

    bar.querySelector('[data-run]').addEventListener('click', run);
    bar.querySelector('[data-swap]').addEventListener('click', () => {
      const t = input.value;
      input.value = output.value;
      output.value = t;
    });
    bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(output.value || '')) ? 'Copied' : 'Copy failed'));
  }

  function mountBase64Text(el, ctx) {
    el.innerHTML = '<div class="tool-grid two"><label class="tool-field"><span class="tool-label">Mode</span><select class="tool-select" data-mode><option value="encode" selected>Text to Base64</option><option value="decode">Base64 to Text</option></select></label><div class="tool-action-row" data-actions></div></div><label class="tool-field"><span class="tool-label">Input</span><textarea class="tool-textarea" data-in></textarea></label><label class="tool-field"><span class="tool-label">Output</span><textarea class="tool-textarea" data-out readonly></textarea></label><p class="tool-status" data-status>Ready.</p>';
    const mode = el.querySelector('[data-mode]');
    const input = el.querySelector('[data-in]');
    const output = el.querySelector('[data-out]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Convert</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const toB64 = (value) => {
      const bytes = new TextEncoder().encode(value);
      let out = '';
      bytes.forEach((b) => { out += String.fromCharCode(b); });
      return btoa(out);
    };
    const fromB64 = (value) => {
      const bin = atob(value);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    };

    bar.querySelector('[data-run]').addEventListener('click', () => {
      try {
        output.value = mode.value === 'encode' ? toB64(input.value || '') : fromB64((input.value || '').trim());
        status.textContent = 'Converted.';
        status.classList.remove('error');
      } catch (e) {
        status.textContent = e.message || 'Invalid Base64 input';
        status.classList.add('error');
      }
    });
    bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(output.value || '')) ? 'Copied' : 'Copy failed'));
  }

  function mountJsonFormatter(el, ctx) {
    el.innerHTML = '<div class="tool-grid three"><label class="tool-field"><span class="tool-label">Mode</span><select class="tool-select" data-mode><option value="format" selected>Format</option><option value="minify">Minify</option></select></label><label class="tool-field"><span class="tool-label">Indent</span><input class="tool-input" data-indent type="number" min="0" max="8" value="2"></label><div class="tool-action-row" data-actions></div></div><label class="tool-field"><span class="tool-label">Input JSON</span><textarea class="tool-textarea" data-in></textarea></label><label class="tool-field"><span class="tool-label">Output</span><textarea class="tool-textarea" data-out readonly></textarea></label><p class="tool-status" data-status>Ready.</p>';
    const mode = el.querySelector('[data-mode]');
    const indent = el.querySelector('[data-indent]');
    const input = el.querySelector('[data-in]');
    const output = el.querySelector('[data-out]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Apply</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    bar.querySelector('[data-run]').addEventListener('click', async () => {
      try {
        const parsed = JSON.parse(input.value || '{}');
        const spaces = clamp(num(indent.value, 2), 0, 8);
        const out = mode.value === 'minify' ? JSON.stringify(parsed) : (await ctx.workerOr('json-format', { input: JSON.stringify(parsed), indent: spaces }, ctx.jsonMain)).formatted;
        output.value = out;
        status.textContent = 'Valid JSON.';
        status.classList.remove('error');
      } catch (e) {
        status.textContent = e.message;
        status.classList.add('error');
      }
    });
    bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(output.value || '')) ? 'Copied' : 'Copy failed'));
  }

  function mountUrlParser(el) {
    el.innerHTML = '<label class="tool-field"><span class="tool-label">URL</span><input class="tool-input" data-url type="text" placeholder="https://example.com/path?x=1#top"></label><div class="tool-action-row" data-actions></div><div class="tool-kv"><div><span>Origin</span><strong data-origin>-</strong></div><div><span>Pathname</span><strong data-path>-</strong></div><div><span>Query</span><strong data-query>-</strong></div><div><span>Hash</span><strong data-hash>-</strong></div></div><p class="tool-status" data-status>Ready.</p>';
    const urlInput = el.querySelector('[data-url]');
    const origin = el.querySelector('[data-origin]');
    const path = el.querySelector('[data-path]');
    const query = el.querySelector('[data-query]');
    const hash = el.querySelector('[data-hash]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Parse</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const run = () => {
      try {
        const url = new URL(urlInput.value || '', window.location.origin);
        origin.textContent = url.origin;
        path.textContent = url.pathname || '/';
        query.textContent = url.search || '(none)';
        hash.textContent = url.hash || '(none)';
        status.textContent = 'Parsed.';
        status.classList.remove('error');
      } catch (e) {
        status.textContent = e.message;
        status.classList.add('error');
      }
    };
    bar.querySelector('[data-run]').addEventListener('click', run);
  }

  function mountCaseConverter(el, ctx) {
    el.innerHTML = '<label class="tool-field"><span class="tool-label">Input</span><textarea class="tool-textarea" data-in></textarea></label><div class="tool-action-row" data-actions></div><label class="tool-field"><span class="tool-label">Output</span><textarea class="tool-textarea" data-out readonly></textarea></label><p class="tool-status" data-status>Pick a transform.</p>';
    const input = el.querySelector('[data-in]');
    const output = el.querySelector('[data-out]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-upper type="button">UPPER</button><button class="tool-btn-secondary" data-lower type="button">lower</button><button class="tool-btn-secondary" data-title type="button">Title</button><button class="tool-btn-secondary" data-sentence type="button">Sentence</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const run = (fn, label) => {
      output.value = fn(input.value || '');
      status.textContent = `${label} applied.`;
      status.classList.remove('error');
    };

    bar.querySelector('[data-upper]').addEventListener('click', () => run((v) => v.toUpperCase(), 'Uppercase'));
    bar.querySelector('[data-lower]').addEventListener('click', () => run((v) => v.toLowerCase(), 'Lowercase'));
    bar.querySelector('[data-title]').addEventListener('click', () => run((v) => v.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()), 'Title case'));
    bar.querySelector('[data-sentence]').addEventListener('click', () => run((v) => v.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (m) => m.toUpperCase()), 'Sentence case'));
    bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(output.value || '')) ? 'Copied' : 'Copy failed'));
  }

  function mountSlugGenerator(el, ctx) {
    el.innerHTML = '<div class="tool-grid two"><label class="tool-field"><span class="tool-label">Separator</span><select class="tool-select" data-sep><option value="-" selected>- hyphen</option><option value="_">_ underscore</option><option value=".">. dot</option></select></label><label class="tool-field inline"><input data-lower type="checkbox" checked><span>Lowercase output</span></label></div><label class="tool-field"><span class="tool-label">Title</span><input class="tool-input" data-in type="text"></label><div class="tool-action-row" data-actions></div><label class="tool-field"><span class="tool-label">Slug</span><input class="tool-input" data-out readonly></label><p class="tool-status" data-status>Ready.</p>';
    const sep = el.querySelector('[data-sep]');
    const lower = el.querySelector('[data-lower]');
    const input = el.querySelector('[data-in]');
    const output = el.querySelector('[data-out]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Generate</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const run = () => {
      const delimiter = sep.value || '-';
      let slug = String(input.value || '')
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, delimiter)
        .replace(new RegExp(`\\${delimiter}+`, 'g'), delimiter)
        .replace(new RegExp(`^\\${delimiter}|\\${delimiter}$`, 'g'), '');
      if (lower.checked) slug = slug.toLowerCase();
      output.value = slug;
      status.textContent = slug ? 'Slug generated.' : 'Enter a title.';
      status.classList.toggle('error', !slug);
    };
    [sep, lower, input].forEach((elm) => elm.addEventListener('input', run));
    bar.querySelector('[data-run]').addEventListener('click', run);
    bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(output.value || '')) ? 'Copied' : 'Copy failed'));
    run();
  }

  function mountLoremGenerator(el, ctx) {
    el.innerHTML = '<div class="tool-grid three"><label class="tool-field"><span class="tool-label">Mode</span><select class="tool-select" data-mode><option value="words">Words</option><option value="sentences" selected>Sentences</option><option value="paragraphs">Paragraphs</option></select></label><label class="tool-field"><span class="tool-label">Count</span><input class="tool-input" data-count type="number" min="1" max="50" value="3"></label><label class="tool-field inline"><input data-start type="checkbox"><span>Start with lorem ipsum</span></label></div><div class="tool-action-row" data-actions></div><textarea class="tool-textarea" data-out readonly></textarea><p class="tool-status" data-status>Ready.</p>';
    const mode = el.querySelector('[data-mode]');
    const count = el.querySelector('[data-count]');
    const start = el.querySelector('[data-start]');
    const out = el.querySelector('[data-out]');
    const status = el.querySelector('[data-status]');
    const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'.split(' ');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Generate</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const pickWord = () => words[randomInt(words.length)];
    const makeSentence = () => {
      const length = clamp(randomInt(11) + 8, 6, 24);
      const parts = Array.from({ length }, (_, i) => (i === 0 && start.checked ? 'lorem' : pickWord()));
      const text = parts.join(' ');
      return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
    };
    const makeParagraph = () => Array.from({ length: clamp(randomInt(4) + 3, 2, 8) }, () => makeSentence()).join(' ');

    const run = () => {
      const n = clamp(num(count.value, 3), 1, 50);
      if (mode.value === 'words') {
        out.value = Array.from({ length: n }, pickWord).join(' ');
      } else if (mode.value === 'sentences') {
        out.value = Array.from({ length: n }, () => makeSentence()).join(' ');
      } else {
        out.value = Array.from({ length: n }, () => makeParagraph()).join('\n\n');
      }
      status.textContent = 'Generated.';
      status.classList.remove('error');
    };

    bar.querySelector('[data-run]').addEventListener('click', run);
    bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
    run();
  }

  function mountRegexTester(el) {
    el.innerHTML = '<div class="tool-grid three"><label class="tool-field"><span class="tool-label">Pattern</span><input class="tool-input" data-pattern type="text" placeholder="\\b[a-z]+\\b"></label><label class="tool-field"><span class="tool-label">Flags</span><input class="tool-input" data-flags type="text" value="gi" placeholder="gim"></label><label class="tool-field"><span class="tool-label">Replace (optional)</span><input class="tool-input" data-replace type="text" placeholder="replacement"></label></div><label class="tool-field"><span class="tool-label">Text</span><textarea class="tool-textarea" data-text></textarea></label><div class="tool-action-row" data-actions></div><div class="tool-table-wrap"><table class="tool-table"><thead><tr><th>#</th><th>Match</th><th>Index</th></tr></thead><tbody data-body></tbody></table></div><label class="tool-field"><span class="tool-label">Replaced Output</span><textarea class="tool-textarea" data-out readonly></textarea></label><p class="tool-status" data-status>Ready.</p>';
    const pattern = el.querySelector('[data-pattern]');
    const flags = el.querySelector('[data-flags]');
    const replace = el.querySelector('[data-replace]');
    const text = el.querySelector('[data-text]');
    const body = el.querySelector('[data-body]');
    const out = el.querySelector('[data-out]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Test</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const run = () => {
      try {
        if (!pattern.value) throw new Error('Pattern is required');
        const safeFlags = (flags.value || '').replace(/[^gimsuyd]/g, '');
        const rx = new RegExp(pattern.value, safeFlags.includes('g') ? safeFlags : `${safeFlags}g`);
        const src = text.value || '';
        const matches = Array.from(src.matchAll(rx)).slice(0, 200);
        body.innerHTML = matches.length
          ? matches.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m[0])}</td><td>${m.index}</td></tr>`).join('')
          : '<tr><td colspan="3">No matches</td></tr>';
        out.value = replace.value ? src.replace(new RegExp(pattern.value, safeFlags), replace.value) : src;
        status.textContent = `Found ${matches.length} match${matches.length === 1 ? '' : 'es'}${matches.length === 200 ? ' (truncated)' : ''}.`;
        status.classList.remove('error');
      } catch (e) {
        status.textContent = e.message;
        status.classList.add('error');
      }
    };
    bar.querySelector('[data-run]').addEventListener('click', run);
  }

  function mountPercentageCalculator(el) {
    el.innerHTML = '<div class="tool-kv"><div><span>X% of Y</span><strong data-a>-</strong></div><div><span>X is what % of Y</span><strong data-b>-</strong></div><div><span>Change % (old to new)</span><strong data-c>-</strong></div></div><div class="tool-grid three"><label class="tool-field"><span class="tool-label">X</span><input class="tool-input" data-x type="number" value="20"></label><label class="tool-field"><span class="tool-label">Y</span><input class="tool-input" data-y type="number" value="100"></label><label class="tool-field"><span class="tool-label">New</span><input class="tool-input" data-new type="number" value="120"></label></div><p class="tool-status" data-status>Live calculations.</p>';
    const x = el.querySelector('[data-x]');
    const y = el.querySelector('[data-y]');
    const n = el.querySelector('[data-new]');
    const a = el.querySelector('[data-a]');
    const b = el.querySelector('[data-b]');
    const c = el.querySelector('[data-c]');
    const status = el.querySelector('[data-status]');
    const run = () => {
      const xv = num(x.value, 0);
      const yv = num(y.value, 0);
      const nv = num(n.value, 0);
      a.textContent = `${((xv / 100) * yv).toFixed(2)}`;
      b.textContent = yv === 0 ? 'N/A' : `${((xv / yv) * 100).toFixed(2)}%`;
      c.textContent = yv === 0 ? 'N/A' : `${(((nv - yv) / yv) * 100).toFixed(2)}%`;
      status.classList.remove('error');
    };
    [x, y, n].forEach((input) => input.addEventListener('input', run));
    run();
  }

  function mountUnitConverter(el) {
    const units = [
      { id: 'm', label: 'Meters', toMeter: 1 },
      { id: 'km', label: 'Kilometers', toMeter: 1000 },
      { id: 'cm', label: 'Centimeters', toMeter: 0.01 },
      { id: 'ft', label: 'Feet', toMeter: 0.3048 },
      { id: 'in', label: 'Inches', toMeter: 0.0254 },
      { id: 'mi', label: 'Miles', toMeter: 1609.344 }
    ];
    const options = units.map((u) => `<option value="${u.id}">${u.label}</option>`).join('');
    el.innerHTML = `<div class="tool-grid three"><label class="tool-field"><span class="tool-label">Value</span><input class="tool-input" data-value type="number" value="1"></label><label class="tool-field"><span class="tool-label">From</span><select class="tool-select" data-from>${options}</select></label><label class="tool-field"><span class="tool-label">To</span><select class="tool-select" data-to>${options}</select></label></div><div class="tool-kv"><div><span>Result</span><strong data-result>-</strong></div></div><p class="tool-status" data-status>Live conversion.</p>`;
    const value = el.querySelector('[data-value]');
    const from = el.querySelector('[data-from]');
    const to = el.querySelector('[data-to]');
    const result = el.querySelector('[data-result]');
    const status = el.querySelector('[data-status]');
    to.value = 'ft';
    const lookup = Object.fromEntries(units.map((u) => [u.id, u]));
    const run = () => {
      const v = num(value.value, NaN);
      if (!Number.isFinite(v)) {
        status.textContent = 'Enter a numeric value.';
        status.classList.add('error');
        return;
      }
      const m = v * lookup[from.value].toMeter;
      const converted = m / lookup[to.value].toMeter;
      result.textContent = `${converted.toFixed(6).replace(/\.?0+$/, '')} ${to.value}`;
      status.textContent = 'Converted.';
      status.classList.remove('error');
    };
    [value, from, to].forEach((input) => input.addEventListener('input', run));
    run();
  }

  function mountLoanCalculator(el) {
    el.innerHTML = '<div class="tool-grid three"><label class="tool-field"><span class="tool-label">Principal</span><input class="tool-input" data-principal type="number" value="250000"></label><label class="tool-field"><span class="tool-label">Rate % (annual)</span><input class="tool-input" data-rate type="number" value="6.25" step="0.01"></label><label class="tool-field"><span class="tool-label">Years</span><input class="tool-input" data-years type="number" value="30"></label></div><div class="tool-grid two"><label class="tool-field"><span class="tool-label">Extra monthly</span><input class="tool-input" data-extra type="number" value="0"></label><div class="tool-action-row" data-actions></div></div><div class="tool-kv"><div><span>Monthly Payment</span><strong data-monthly>-</strong></div><div><span>Total Interest</span><strong data-interest>-</strong></div><div><span>Total Paid</span><strong data-total>-</strong></div></div><p class="tool-status" data-status>Ready.</p>';
    const principal = el.querySelector('[data-principal]');
    const rate = el.querySelector('[data-rate]');
    const years = el.querySelector('[data-years]');
    const extra = el.querySelector('[data-extra]');
    const monthlyEl = el.querySelector('[data-monthly]');
    const interestEl = el.querySelector('[data-interest]');
    const totalEl = el.querySelector('[data-total]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Calculate</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const money = (n) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
    const run = () => {
      const p = num(principal.value, NaN);
      const r = num(rate.value, NaN) / 100 / 12;
      const n = clamp(num(years.value, NaN), 1, 50) * 12;
      const extraPay = Math.max(0, num(extra.value, 0));
      if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(r) || !Number.isFinite(n)) {
        status.textContent = 'Enter valid principal/rate/years.';
        status.classList.add('error');
        return;
      }
      const base = r === 0 ? p / n : (p * r) / (1 - Math.pow(1 + r, -n));
      let balance = p;
      let paid = 0;
      let guard = 0;
      while (balance > 0.01 && guard < (n * 2)) {
        const interest = balance * r;
        const payment = Math.min(balance + interest, base + extraPay);
        balance = balance + interest - payment;
        paid += payment;
        guard += 1;
      }
      const interestTotal = paid - p;
      monthlyEl.textContent = money(base + extraPay);
      interestEl.textContent = money(Math.max(0, interestTotal));
      totalEl.textContent = money(paid);
      status.textContent = `Estimated payoff in ${guard} month${guard === 1 ? '' : 's'}.`;
      status.classList.remove('error');
    };

    bar.querySelector('[data-run]').addEventListener('click', run);
    [principal, rate, years, extra].forEach((input) => input.addEventListener('input', run));
    run();
  }

  function mountPasswordGenerator(el, ctx) {
    el.innerHTML = '<div class="tool-grid three"><label class="tool-field"><span class="tool-label">Length</span><input class="tool-input tool-range" data-length type="range" min="8" max="64" value="20"><span class="tool-meta" data-length-label>20</span></label><label class="tool-field inline"><input data-upper type="checkbox" checked><span>Uppercase</span></label><label class="tool-field inline"><input data-numbers type="checkbox" checked><span>Numbers</span></label></div><div class="tool-grid two"><label class="tool-field inline"><input data-symbols type="checkbox" checked><span>Symbols</span></label><div class="tool-action-row" data-actions></div></div><label class="tool-field"><span class="tool-label">Password</span><input class="tool-input" data-out readonly></label><p class="tool-status" data-status>Ready.</p>';
    const length = el.querySelector('[data-length]');
    const lengthLabel = el.querySelector('[data-length-label]');
    const upper = el.querySelector('[data-upper]');
    const numbers = el.querySelector('[data-numbers]');
    const symbols = el.querySelector('[data-symbols]');
    const out = el.querySelector('[data-out]');
    const status = el.querySelector('[data-status]');
    const bar = ActionBar();
    bar.innerHTML = '<button class="tool-btn" data-run type="button">Generate</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
    el.querySelector('[data-actions]').appendChild(bar);

    const randIndex = (max) => {
      if (window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        window.crypto.getRandomValues(arr);
        return arr[0] % max;
      }
      return Math.floor(Math.random() * max);
    };

    const run = () => {
      const lowerSet = 'abcdefghijklmnopqrstuvwxyz';
      const upperSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numberSet = '0123456789';
      const symbolSet = '!@#$%^&*()-_=+[]{}:;,.?';
      let chars = lowerSet;
      if (upper.checked) chars += upperSet;
      if (numbers.checked) chars += numberSet;
      if (symbols.checked) chars += symbolSet;
      const size = clamp(num(length.value, 20), 8, 64);
      lengthLabel.textContent = String(size);
      let pass = '';
      for (let i = 0; i < size; i += 1) pass += chars[randIndex(chars.length)];
      out.value = pass;
      status.textContent = 'Generated.';
      status.classList.remove('error');
    };

    [length, upper, numbers, symbols].forEach((input) => input.addEventListener('input', run));
    bar.querySelector('[data-run]').addEventListener('click', run);
    bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
    run();
  }

  function mountPlannedLab(el, ctx) {
    const meta = toolMeta.get(ctx.toolId) || {};
    const planned = Array.isArray(meta.planned) ? meta.planned : [];
    el.innerHTML = `
      <div class="tool-kv">
        <div><span>Lab Status</span><strong>Planned</strong></div>
        <div><span>Scope</span><strong>${esc(meta.scope || 'Expansion')}</strong></div>
      </div>
      <div class="tool-result-panel" style="padding:0.8rem;">
        <p class="tool-status">This lab is wired into the new architecture and ready for incremental tool rollout.</p>
        <ul class="tool-list-inline" style="display:grid;gap:0.42rem;margin:0.6rem 0 0;padding-left:1rem;">
          ${planned.map((item) => `<li>${esc(item)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  function loadPlannedLabs() {
    [
      'data-lab-hub',
      'ai-lab-hub',
      'design-lab-hub',
      'media-lab-hub',
      'advanced-security-hub',
      'dev-lab-hub',
      'web-lab-hub',
      'logic-lab-hub'
    ].forEach((id) => {
      if (!tools.has(id)) registerTool({ id, mount: mountPlannedLab });
    });
  }

  function slugToolId(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  const EXPANDED_LAB_CATALOG = {
    security: [
      'Hash Generator (MD5/SHA1/SHA256/SHA512)',
      'HMAC Generator',
      'JWT Encode / Decode',
      'Password Generator + Entropy Meter',
      'Base32/Base58 Encoder',
      'UUID v4/v7 Generator',
      'Random Secure Key Generator',
      'Digital Signature Demo'
    ],
    data: [
      'Number Base Converter',
      'Encoding Converter (Base64/URL/HTML)',
      'Time Converter (Unix ↔ Human)',
      'Units Converter (Length/Weight/Temperature)',
      'CSV ↔ JSON',
      'JSON ↔ YAML',
      'Binary ↔ Text',
      'Color Formats Converter'
    ],
    writing: [
      'Case Tools',
      'Slugify',
      'Word/Char Counter',
      'Readability Analysis',
      'Regex Tester',
      'Diff Viewer',
      'Markdown Preview',
      'Word Frequency',
      'Text Sorter',
      'Remove Duplicates',
      'Find/Replace',
      'JSON Formatter',
      'HTML Beautifier/Minifier'
    ],
    'data-lab': [
      'JSON Formatter',
      'JSON Validator',
      'JSON Path Explorer',
      'CSV Viewer',
      'SQL Formatter',
      'XML Viewer',
      'YAML Viewer',
      'Graph Visualizer',
      'Random Data Generator'
    ],
    'ai-lab': [
      'Local Summarizer',
      'Sentiment Analysis',
      'Keyword Extractor',
      'Text Classifier',
      'Local Embedding Generator',
      'Image Classifier',
      'Object Detection Demo',
      'Background Removal Demo',
      'AI Color Palette Generator',
      'Prompt Optimizer',
      'Token Counter',
      'AI Text Cleanup',
      'Code Explanation Assistant',
      'AI Title Generator',
      'AI Regex Generator'
    ],
    'design-lab': [
      'HEX ↔ RGB ↔ HSL Converter',
      'Gradient Generator',
      'Glassmorphism Generator',
      'Shadow Generator',
      'CSS Clip-Path Generator',
      'Tailwind Class Generator',
      'Figma Color Exporter',
      'WCAG Contrast Checker',
      'Palette Extractor from Image',
      'Color Blindness Simulator',
      'Theme Generator',
      'Noise Texture Generator',
      'Grid Generator',
      'SVG Pattern Generator'
    ],
    'media-lab': [
      'Video to GIF',
      'Trim Video',
      'Extract Audio',
      'Compress Video',
      'Resize Video',
      'Merge Videos',
      'Frame Extractor',
      'Subtitle Embedder',
      'Subtitle Generator',
      'Image to Video Slideshow',
      'Reverse Video',
      'Video Speed Changer',
      'Image Optimizer',
      'SVG Optimizer',
      'WebP Converter',
      'Audio Trimmer',
      'Audio Volume Adjuster',
      'Audio Waveform Visualizer'
    ],
    'advanced-security': [
      'AES Encrypt/Decrypt',
      'RSA Key Pair Generator',
      'Public/Private Key Inspector',
      'JWT Debugger',
      'Certificate Parser',
      'Bcrypt Hash Generator',
      'Password Entropy Visualizer',
      'Encrypted QR Code Generator',
      'TOTP Generator',
      'Secure Note Encryptor',
      'File Checksum Generator',
      'PGP Demo Encrypt/Decrypt'
    ],
    productivity: [
      'Pomodoro Timer',
      'Habit Tracker',
      'Task Timer',
      'Focus Music Player',
      'Kanban Board',
      'Daily Planner',
      'Time Blocking Planner',
      'Weekly Goals Tracker',
      'Meeting Timer',
      'Eisenhower Matrix',
      'Decision Matrix',
      'Brain Dump Board',
      'Random Idea Generator',
      'Daily Quote Generator',
      'Time Zone Planner',
      'Shift Calculator',
      'GPA Calculator',
      'Mortgage Calculator',
      'Investment Compound Calculator',
      'Budget Planner',
      'Streak Tracker',
      'Session Logger',
      'Quick Scratchpad',
      'Sticky Notes Wall'
    ],
    'dev-lab': [
      'HTTP Request Tester',
      'JWT Debugger',
      'Curl → Fetch Converter',
      'SQL Formatter',
      'JSON Schema Generator',
      'OpenAPI Viewer',
      'Webhook Tester',
      'JWT Inspector',
      'HTTP Status Reference',
      'CSS Specificity Calculator',
      'Regex Visualizer',
      'Cron Expression Parser',
      'Cron Generator',
      'Git Commit Message Formatter',
      'Conventional Commit Builder',
      'Code-Aware Diff Viewer',
      'Code Snippet Formatter',
      'UUID Batch Generator',
      'Local API Mock Server'
    ],
    'web-lab': [
      'Meta Tag Generator',
      'OpenGraph Preview Tool',
      'Robots.txt Generator',
      'Sitemap Generator',
      'Favicon Generator',
      'Markdown to HTML Exporter',
      'HTML to JSX Converter',
      'SVG to JSX Converter',
      'PWA Manifest Generator',
      'JSON to TypeScript Types',
      'TypeScript to JSON Schema'
    ],
    'logic-lab': [
      'Decision Wheel',
      'Random Team Generator',
      'Dice Roller',
      'Probability Calculator',
      'Truth Table Generator',
      'Logic Gate Simulator',
      'Graph Plotter',
      'Function Visualizer',
      'Matrix Calculator',
      'Unit Dimension Analyzer'
    ]
  };

  function buildGeneratedPlannedMeta() {
    const generated = [];
    const used = new Set(toolMeta.keys());
    const grouped = new Map();
    Array.from(toolMeta.values()).forEach((meta) => {
      if (!meta || !Array.isArray(meta.planned) || !meta.planned.length || !meta.tabId) return;
      if (!grouped.has(meta.tabId)) grouped.set(meta.tabId, new Set());
      meta.planned.forEach((label) => grouped.get(meta.tabId).add(label));
    });

    grouped.forEach((labels, tabId) => {
      Array.from(labels).forEach((label, idx) => {
        const raw = `${tabId}-${slugToolId(label) || `tool-${idx + 1}`}`;
        let id = raw;
        let n = 2;
        while (used.has(id)) {
          id = `${raw}-${n}`;
          n += 1;
        }
        used.add(id);
        generated.push({
          id,
          title: String(label || `Tool ${idx + 1}`),
          description: `${tabId} - ${label}`,
          icon: 'fa-screwdriver-wrench',
          tabId,
          subtabId: 'planned-tools',
          generatedFromPlanned: true
        });
      });
    });
    return generated;
  }

  function appendGeneratedToolsToTabs(generated = []) {
    if (!generated.length) return;
    const byTab = new Map();
    generated.forEach((meta) => {
      if (!byTab.has(meta.tabId)) byTab.set(meta.tabId, []);
      byTab.get(meta.tabId).push(meta.id);
    });
    byTab.forEach((ids, tabId) => {
      const tab = tabs.get(tabId);
      if (!tab) return;
      const merged = Array.from(new Set([...(tab.tools || []), ...ids]));
      tab.tools = merged;
      const subtabs = Array.isArray(tab.subtabs) ? tab.subtabs.slice() : [];
      const existing = subtabs.find((s) => s.id === 'planned-tools');
      if (existing) {
        existing.tools = Array.from(new Set([...(existing.tools || []), ...ids]));
      } else {
        subtabs.push({
          id: 'planned-tools',
          label: 'Lab Tools',
          icon: 'fa-screwdriver-wrench',
          tools: ids.slice()
        });
      }
      tab.subtabs = subtabs;
    });
  }

  function mountGeneratedPlannedTool(el, ctx) {
    const meta = toolMeta.get(ctx.toolId) || {};
    const label = String(meta.title || '').toLowerCase();

    const baseLayout = (inputLabel = 'Input', outputLabel = 'Output', placeholders = {}) => {
      el.innerHTML = `
        <div class="tool-grid two">
          <label class="tool-field"><span class="tool-label">${esc(inputLabel)}</span><textarea class="tool-textarea" data-in placeholder="${esc(placeholders.input || '')}"></textarea></label>
          <label class="tool-field"><span class="tool-label">Options</span><textarea class="tool-textarea" data-opt placeholder="${esc(placeholders.options || '')}"></textarea></label>
        </div>
        <div class="tool-action-row" data-actions></div>
        <label class="tool-field"><span class="tool-label">${esc(outputLabel)}</span><textarea class="tool-textarea" data-out readonly></textarea></label>
        <p class="tool-status" data-status>Ready.</p>
      `;
      const input = el.querySelector('[data-in]');
      const opt = el.querySelector('[data-opt]');
      const out = el.querySelector('[data-out]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Run</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
      el.querySelector('[data-actions]').appendChild(bar);
      const setStatus = (text, isError = false) => {
        status.textContent = text;
        status.classList.toggle('error', isError);
      };
      bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
      return { input, opt, out, status, setStatus, runBtn: bar.querySelector('[data-run]') };
    };

    const summarizeText = (text) => {
      const src = String(text || '').trim();
      if (!src) return '';
      const sentences = src.split(/(?<=[.!?])\s+/).filter(Boolean);
      if (sentences.length <= 2) return src;
      return sentences.slice(0, 2).join(' ');
    };

    const sentimentScore = (text) => {
      const pos = ['good', 'great', 'love', 'excellent', 'happy', 'clear', 'fast', 'win', 'nice'];
      const neg = ['bad', 'hate', 'awful', 'sad', 'bug', 'slow', 'pain', 'lose', 'broken'];
      const words = String(text || '').toLowerCase().match(/[a-z']+/g) || [];
      let score = 0;
      words.forEach((word) => {
        if (pos.includes(word)) score += 1;
        if (neg.includes(word)) score -= 1;
      });
      return score;
    };

    const keywordSummary = (text, top = 8) => {
      const stop = new Set(['the', 'and', 'for', 'that', 'with', 'this', 'from', 'your', 'into', 'have', 'are', 'was', 'were', 'but', 'you', 'our', 'not', 'all', 'can']);
      const counts = new Map();
      (String(text || '').toLowerCase().match(/[a-z]{3,}/g) || []).forEach((word) => {
        if (stop.has(word)) return;
        counts.set(word, (counts.get(word) || 0) + 1);
      });
      return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, top);
    };

    if (label.includes('json validator')) {
      const ui = baseLayout('JSON', 'Validation');
      ui.opt.value = 'Optional: strict=true';
      ui.runBtn.addEventListener('click', () => {
        try {
          const parsed = JSON.parse(ui.input.value || '{}');
          ui.out.value = `Valid JSON\nType: ${Array.isArray(parsed) ? 'array' : typeof parsed}\nKeys: ${parsed && typeof parsed === 'object' ? Object.keys(parsed).length : 0}`;
          ui.setStatus('JSON is valid.');
        } catch (error) {
          ui.out.value = '';
          ui.setStatus(error.message, true);
        }
      });
      return;
    }

    if (label.includes('json path')) {
      const ui = baseLayout('JSON', 'Path Result', { options: 'Path, e.g. user.profile.name or users[0].id' });
      ui.runBtn.addEventListener('click', () => {
        try {
          const data = JSON.parse(ui.input.value || '{}');
          const pathRaw = (ui.opt.value || '').trim();
          const tokens = pathRaw.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
          let value = data;
          tokens.forEach((token) => {
            value = value?.[token];
          });
          ui.out.value = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
          ui.setStatus('Path evaluated.');
        } catch (error) {
          ui.out.value = '';
          ui.setStatus(error.message, true);
        }
      });
      return;
    }

    if (label.includes('csv viewer')) {
      el.innerHTML = `
        <label class="tool-field"><span class="tool-label">CSV Input</span><textarea class="tool-textarea" data-in placeholder="name,email&#10;Nomu,nomu@example.com"></textarea></label>
        <div class="tool-action-row" data-actions></div>
        <div class="tool-table-wrap"><table class="tool-table"><thead data-head></thead><tbody data-body></tbody></table></div>
        <p class="tool-status" data-status>Ready.</p>
      `;
      const input = el.querySelector('[data-in]');
      const head = el.querySelector('[data-head]');
      const body = el.querySelector('[data-body]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Render</button>';
      el.querySelector('[data-actions]').appendChild(bar);
      bar.querySelector('[data-run]').addEventListener('click', () => {
        const rows = parseCsv(input.value || '');
        if (!rows.length) {
          status.textContent = 'No rows.';
          head.innerHTML = '';
          body.innerHTML = '';
          return;
        }
        const cols = rows[0] || [];
        head.innerHTML = `<tr>${cols.map((cell) => `<th>${esc(cell)}</th>`).join('')}</tr>`;
        body.innerHTML = rows.slice(1).map((row) => `<tr>${cols.map((_, idx) => `<td>${esc(row[idx] || '')}</td>`).join('')}</tr>`).join('');
        status.textContent = `${rows.length - 1} row(s) rendered.`;
      });
      return;
    }

    if (label.includes('sql formatter')) {
      const ui = baseLayout('SQL', 'Formatted SQL');
      const KW = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|JOIN|ON|AND|OR|LIMIT|OFFSET|INSERT INTO|VALUES|UPDATE|SET|DELETE)\b/gi;
      ui.runBtn.addEventListener('click', () => {
        const formatted = String(ui.input.value || '')
          .replace(/\s+/g, ' ')
          .replace(KW, '\n$1')
          .replace(/\n+/g, '\n')
          .trim();
        ui.out.value = formatted;
        ui.setStatus('Formatted.');
      });
      return;
    }

    if (label.includes('xml/yaml viewer') || label.includes('xml viewer') || label.includes('yaml viewer')) {
      const ui = baseLayout(label.includes('xml') ? 'XML' : 'YAML', 'Normalized View');
      ui.runBtn.addEventListener('click', () => {
        const src = String(ui.input.value || '').trim();
        if (!src) {
          ui.out.value = '';
          ui.setStatus('Input required.', true);
          return;
        }
        if (label.includes('xml')) {
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(src, 'application/xml');
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) throw new Error(parseError.textContent || 'Invalid XML');
            ui.out.value = new XMLSerializer().serializeToString(xmlDoc);
            ui.setStatus('XML parsed.');
          } catch (error) {
            ui.out.value = '';
            ui.setStatus(error.message, true);
          }
        } else {
          const lines = src.split(/\r?\n/).map((line) => line.replace(/\t/g, '  ').trimEnd());
          ui.out.value = lines.join('\n');
          ui.setStatus('YAML normalized.');
        }
      });
      return;
    }

    if (label.includes('graph visualizer')) {
      const ui = baseLayout('JSON', 'Tree');
      ui.runBtn.addEventListener('click', () => {
        try {
          const data = JSON.parse(ui.input.value || '{}');
          const lines = [];
          const walk = (node, path) => {
            if (node && typeof node === 'object') {
              Object.keys(node).forEach((key) => walk(node[key], `${path}.${key}`));
            } else {
              lines.push(`${path}: ${String(node)}`);
            }
          };
          walk(data, 'root');
          ui.out.value = lines.join('\n') || 'No scalar nodes.';
          ui.setStatus('Tree generated.');
        } catch (error) {
          ui.out.value = '';
          ui.setStatus(error.message, true);
        }
      });
      return;
    }

    if (label.includes('random data generator')) {
      const ui = baseLayout('Row count', 'Random JSON', { input: '10' });
      ui.input.value = '10';
      ui.runBtn.addEventListener('click', () => {
        const count = clamp(num(ui.input.value, 10), 1, 200);
        const rows = Array.from({ length: count }).map((_, idx) => ({
          id: idx + 1,
          name: `User_${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
          email: `user${Math.floor(Math.random() * 9000) + 1000}@example.dev`,
          score: Math.floor(Math.random() * 100)
        }));
        ui.out.value = JSON.stringify(rows, null, 2);
        ui.setStatus(`${count} rows generated.`);
      });
      return;
    }

    if (label.includes('summarizer')) {
      const ui = baseLayout('Text', 'Summary');
      ui.runBtn.addEventListener('click', () => {
        ui.out.value = summarizeText(ui.input.value);
        ui.setStatus('Summary created.');
      });
      return;
    }

    if (label.includes('sentiment')) {
      const ui = baseLayout('Text', 'Sentiment');
      ui.runBtn.addEventListener('click', () => {
        const score = sentimentScore(ui.input.value);
        const mood = score > 1 ? 'Positive' : (score < -1 ? 'Negative' : 'Neutral');
        ui.out.value = `${mood}\nScore: ${score}`;
        ui.setStatus('Sentiment scored.');
      });
      return;
    }

    if (label.includes('keyword extractor')) {
      const ui = baseLayout('Text', 'Keywords');
      ui.runBtn.addEventListener('click', () => {
        const items = keywordSummary(ui.input.value, 10);
        ui.out.value = items.map(([word, count]) => `${word}: ${count}`).join('\n');
        ui.setStatus('Keywords extracted.');
      });
      return;
    }

    if (label.includes('text classifier')) {
      const ui = baseLayout('Text', 'Class');
      ui.runBtn.addEventListener('click', () => {
        const src = String(ui.input.value || '').toLowerCase();
        const classes = [
          { label: 'Development', words: ['code', 'api', 'javascript', 'bug', 'deploy'] },
          { label: 'Design', words: ['color', 'ui', 'layout', 'typography', 'visual'] },
          { label: 'Business', words: ['market', 'revenue', 'client', 'sales', 'growth'] },
          { label: 'Personal', words: ['life', 'habit', 'routine', 'health', 'daily'] }
        ];
        const scored = classes.map((item) => ({
          label: item.label,
          score: item.words.reduce((sum, word) => sum + (src.includes(word) ? 1 : 0), 0)
        })).sort((a, b) => b.score - a.score);
        ui.out.value = `${scored[0].label}\n\n${scored.map((item) => `${item.label}: ${item.score}`).join('\n')}`;
        ui.setStatus('Classified.');
      });
      return;
    }

    if (label.includes('embedding')) {
      const ui = baseLayout('Text', 'Embedding Vector');
      ui.runBtn.addEventListener('click', () => {
        const src = String(ui.input.value || '');
        const vec = Array.from({ length: 16 }).map((_, idx) => {
          let sum = 0;
          for (let i = 0; i < src.length; i += 1) sum += src.charCodeAt(i) * (idx + 1);
          return Number((((sum % 1000) / 1000) * 2 - 1).toFixed(4));
        });
        ui.out.value = `[${vec.join(', ')}]`;
        ui.setStatus('Embedding generated.');
      });
      return;
    }

    if (label.includes('image classifier')) {
      el.innerHTML = `
        <label class="tool-field"><span class="tool-label">Image</span><input class="tool-input" data-file type="file" accept="image/*"></label>
        <div class="tool-action-row" data-actions></div>
        <label class="tool-field"><span class="tool-label">Classification</span><textarea class="tool-textarea" data-out readonly></textarea></label>
        <p class="tool-status" data-status>Ready.</p>
      `;
      const file = el.querySelector('[data-file]');
      const out = el.querySelector('[data-out]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Classify</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
      el.querySelector('[data-actions]').appendChild(bar);
      bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
      bar.querySelector('[data-run]').addEventListener('click', () => {
        const f = file.files && file.files[0];
        if (!f) {
          status.textContent = 'Select an image.';
          status.classList.add('error');
          return;
        }
        const img = new Image();
        const url = URL.createObjectURL(f);
        img.onload = () => {
          const c = document.createElement('canvas');
          const g = c.getContext('2d');
          c.width = 64;
          c.height = 64;
          g.drawImage(img, 0, 0, c.width, c.height);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          let r = 0;
          let gSum = 0;
          let b = 0;
          for (let i = 0; i < d.length; i += 4) {
            r += d[i];
            gSum += d[i + 1];
            b += d[i + 2];
          }
          const total = d.length / 4;
          r /= total;
          gSum /= total;
          b /= total;
          const brightness = (r + gSum + b) / 3;
          const tone = r > b ? 'warm' : 'cool';
          const mood = brightness > 140 ? 'bright' : 'dark';
          out.value = `Class: ${mood}-${tone}\nAvg RGB: ${r.toFixed(0)}, ${gSum.toFixed(0)}, ${b.toFixed(0)}`;
          status.textContent = 'Image classified.';
          status.classList.remove('error');
          URL.revokeObjectURL(url);
        };
        img.src = url;
      });
      return;
    }

    if (label.includes('prompt optimizer')) {
      const ui = baseLayout('Prompt Draft', 'Optimized Prompt');
      ui.opt.value = 'Goal: \nConstraints: \nTone:';
      ui.runBtn.addEventListener('click', () => {
        const goal = ui.opt.value || '';
        const body = ui.input.value || '';
        ui.out.value = `Role: Expert assistant\nTask:\n${body}\n\nContext:\n${goal}\n\nOutput format:\n- Bullet summary\n- Action plan\n- Risks`;
        ui.setStatus('Prompt optimized.');
      });
      return;
    }

    if (label.includes('gradient generator')) {
      el.innerHTML = `
        <div class="tool-grid three">
          <label class="tool-field"><span class="tool-label">Color A</span><input class="tool-input" data-a type="color" value="#4A90E2"></label>
          <label class="tool-field"><span class="tool-label">Color B</span><input class="tool-input" data-b type="color" value="#8FD3FE"></label>
          <label class="tool-field"><span class="tool-label">Angle</span><input class="tool-input tool-range" data-angle type="range" min="0" max="360" value="135"></label>
        </div>
        <div class="tool-color-preview" data-preview></div>
        <label class="tool-field"><span class="tool-label">CSS</span><textarea class="tool-textarea" data-out readonly></textarea></label>
        <div class="tool-action-row" data-actions></div>
        <p class="tool-status" data-status>Ready.</p>
      `;
      const colorA = el.querySelector('[data-a]');
      const colorB = el.querySelector('[data-b]');
      const angle = el.querySelector('[data-angle]');
      const preview = el.querySelector('[data-preview]');
      const out = el.querySelector('[data-out]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Generate</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
      el.querySelector('[data-actions]').appendChild(bar);
      const run = () => {
        const css = `linear-gradient(${num(angle.value, 135)}deg, ${colorA.value} 0%, ${colorB.value} 100%)`;
        preview.style.background = css;
        out.value = `background: ${css};`;
        status.textContent = 'Gradient generated.';
        status.classList.remove('error');
      };
      [colorA, colorB, angle].forEach((input) => input.addEventListener('input', run));
      bar.querySelector('[data-run]').addEventListener('click', run);
      bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
      run();
      return;
    }

    if (label.includes('glassmorphism generator')) {
      el.innerHTML = `
        <div class="tool-grid three">
          <label class="tool-field"><span class="tool-label">Tint</span><input class="tool-input" data-tint type="color" value="#9EC7FF"></label>
          <label class="tool-field"><span class="tool-label">Opacity</span><input class="tool-input tool-range" data-opacity type="range" min="5" max="90" value="28"></label>
          <label class="tool-field"><span class="tool-label">Blur</span><input class="tool-input tool-range" data-blur type="range" min="2" max="40" value="16"></label>
        </div>
        <div class="tool-grid two">
          <label class="tool-field"><span class="tool-label">Radius</span><input class="tool-input" data-radius type="number" min="4" max="48" value="16"></label>
          <label class="tool-field"><span class="tool-label">Border Opacity</span><input class="tool-input tool-range" data-border type="range" min="5" max="80" value="34"></label>
        </div>
        <div class="tool-color-preview" data-preview></div>
        <label class="tool-field"><span class="tool-label">CSS</span><textarea class="tool-textarea" data-out readonly></textarea></label>
        <div class="tool-action-row" data-actions></div>
        <p class="tool-status" data-status>Ready.</p>
      `;
      const tint = el.querySelector('[data-tint]');
      const opacity = el.querySelector('[data-opacity]');
      const blur = el.querySelector('[data-blur]');
      const radius = el.querySelector('[data-radius]');
      const border = el.querySelector('[data-border]');
      const preview = el.querySelector('[data-preview]');
      const out = el.querySelector('[data-out]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Generate</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
      el.querySelector('[data-actions]').appendChild(bar);
      const run = () => {
        const rgb = parseColor(tint.value || '#9EC7FF');
        const glass = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(clamp(num(opacity.value, 28), 0, 100) / 100).toFixed(2)})`;
        const borderAlpha = (clamp(num(border.value, 34), 0, 100) / 100).toFixed(2);
        const css = [
          `background: ${glass};`,
          `backdrop-filter: blur(${clamp(num(blur.value, 16), 2, 40)}px) saturate(130%);`,
          `-webkit-backdrop-filter: blur(${clamp(num(blur.value, 16), 2, 40)}px) saturate(130%);`,
          `border: 1px solid rgba(255, 255, 255, ${borderAlpha});`,
          `border-radius: ${clamp(num(radius.value, 16), 4, 48)}px;`,
          'box-shadow: 0 18px 34px rgba(0, 0, 0, 0.28);'
        ].join('\n');
        out.value = css;
        preview.style.background = `linear-gradient(135deg, ${glass}, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08))`;
        preview.style.border = `1px solid rgba(255,255,255,${borderAlpha})`;
        preview.style.backdropFilter = `blur(${clamp(num(blur.value, 16), 2, 40)}px) saturate(130%)`;
        preview.style.webkitBackdropFilter = `blur(${clamp(num(blur.value, 16), 2, 40)}px) saturate(130%)`;
        preview.style.borderRadius = `${clamp(num(radius.value, 16), 4, 48)}px`;
        status.textContent = 'Glass style generated.';
        status.classList.remove('error');
      };
      [tint, opacity, blur, radius, border].forEach((input) => input.addEventListener('input', run));
      bar.querySelector('[data-run]').addEventListener('click', run);
      bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
      run();
      return;
    }

    if (label.includes('svg pattern generator')) {
      el.innerHTML = `
        <div class="tool-grid three">
          <label class="tool-field"><span class="tool-label">Pattern</span><select class="tool-select" data-pattern><option value="dots">Dots</option><option value="grid">Grid</option><option value="diagonal">Diagonal</option></select></label>
          <label class="tool-field"><span class="tool-label">Foreground</span><input class="tool-input" data-fg type="color" value="#8FD3FE"></label>
          <label class="tool-field"><span class="tool-label">Background</span><input class="tool-input" data-bg type="color" value="#0A1119"></label>
        </div>
        <div class="tool-grid two">
          <label class="tool-field"><span class="tool-label">Size</span><input class="tool-input" data-size type="number" min="8" max="120" value="36"></label>
          <label class="tool-field"><span class="tool-label">Stroke</span><input class="tool-input" data-stroke type="number" min="1" max="12" value="2"></label>
        </div>
        <div class="tool-color-preview" data-preview></div>
        <label class="tool-field"><span class="tool-label">SVG</span><textarea class="tool-textarea" data-out readonly></textarea></label>
        <div class="tool-action-row" data-actions></div>
        <p class="tool-status" data-status>Ready.</p>
      `;
      const pattern = el.querySelector('[data-pattern]');
      const fg = el.querySelector('[data-fg]');
      const bg = el.querySelector('[data-bg]');
      const size = el.querySelector('[data-size]');
      const stroke = el.querySelector('[data-stroke]');
      const preview = el.querySelector('[data-preview]');
      const out = el.querySelector('[data-out]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Generate</button><button class="tool-btn-secondary" data-copy type="button">Copy SVG</button>';
      el.querySelector('[data-actions]').appendChild(bar);
      const run = () => {
        const tile = clamp(num(size.value, 36), 8, 120);
        const line = clamp(num(stroke.value, 2), 1, 12);
        let shape = '';
        if (pattern.value === 'dots') {
          const r = Math.max(1, Math.round(tile / 7));
          shape = `<circle cx="${Math.round(tile / 2)}" cy="${Math.round(tile / 2)}" r="${r}" fill="${fg.value}" />`;
        } else if (pattern.value === 'grid') {
          shape = `<path d="M ${tile} 0 L 0 0 0 ${tile}" fill="none" stroke="${fg.value}" stroke-width="${line}" />`;
        } else {
          shape = `<path d="M -${tile} ${tile} L ${tile} -${tile} M 0 ${tile * 2} L ${tile * 2} 0" fill="none" stroke="${fg.value}" stroke-width="${line}" />`;
        }
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="${tile}" viewBox="0 0 ${tile} ${tile}"><rect width="${tile}" height="${tile}" fill="${bg.value}" />${shape}</svg>`;
        const encoded = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
        out.value = svg;
        preview.style.backgroundImage = `url("${encoded}")`;
        preview.style.backgroundSize = `${tile}px ${tile}px`;
        preview.style.backgroundColor = bg.value;
        status.textContent = 'SVG pattern generated.';
        status.classList.remove('error');
      };
      [pattern, fg, bg, size, stroke].forEach((input) => input.addEventListener('input', run));
      bar.querySelector('[data-run]').addEventListener('click', run);
      bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
      run();
      return;
    }

    if (label.includes('noise/grid generators')) {
      el.innerHTML = `
        <div class="tool-grid three">
          <label class="tool-field"><span class="tool-label">Mode</span><select class="tool-select" data-mode><option value="noise">Noise</option><option value="grid">Grid</option></select></label>
          <label class="tool-field"><span class="tool-label">Size</span><input class="tool-input" data-size type="number" min="16" max="256" value="64"></label>
          <label class="tool-field"><span class="tool-label">Density</span><input class="tool-input tool-range" data-density type="range" min="5" max="95" value="32"></label>
        </div>
        <div class="tool-grid two">
          <label class="tool-field"><span class="tool-label">Foreground</span><input class="tool-input" data-fg type="color" value="#B9D6FF"></label>
          <label class="tool-field"><span class="tool-label">Background</span><input class="tool-input" data-bg type="color" value="#0A1119"></label>
        </div>
        <div class="tool-color-preview" data-preview></div>
        <label class="tool-field"><span class="tool-label">CSS</span><textarea class="tool-textarea" data-out readonly></textarea></label>
        <div class="tool-action-row" data-actions></div>
        <p class="tool-status" data-status>Ready.</p>
      `;
      const mode = el.querySelector('[data-mode]');
      const size = el.querySelector('[data-size]');
      const density = el.querySelector('[data-density]');
      const fg = el.querySelector('[data-fg]');
      const bg = el.querySelector('[data-bg]');
      const preview = el.querySelector('[data-preview]');
      const out = el.querySelector('[data-out]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Generate</button><button class="tool-btn-secondary" data-copy type="button">Copy CSS</button>';
      el.querySelector('[data-actions]').appendChild(bar);
      const run = () => {
        const tile = clamp(num(size.value, 64), 16, 256);
        const den = clamp(num(density.value, 32), 5, 95);
        const canvas = document.createElement('canvas');
        canvas.width = tile;
        canvas.height = tile;
        const g = canvas.getContext('2d');
        g.fillStyle = bg.value;
        g.fillRect(0, 0, tile, tile);
        if (mode.value === 'noise') {
          const fgRgb = parseColor(fg.value || '#B9D6FF');
          const alpha = clamp(den / 100, 0.05, 0.95);
          for (let i = 0; i < tile * tile * 0.45; i += 1) {
            const x = randomInt(tile);
            const y = randomInt(tile);
            const v = randomInt(100);
            g.fillStyle = `rgba(${fgRgb.r}, ${fgRgb.g}, ${fgRgb.b}, ${Math.max(0.04, alpha * (v / 100)).toFixed(3)})`;
            g.fillRect(x, y, 1, 1);
          }
        } else {
          g.strokeStyle = fg.value;
          g.lineWidth = Math.max(1, Math.round((den / 100) * 4));
          const step = Math.max(4, Math.round(tile / 8));
          for (let x = 0; x <= tile; x += step) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, tile);
            g.stroke();
          }
          for (let y = 0; y <= tile; y += step) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(tile, y);
            g.stroke();
          }
        }
        const dataUrl = canvas.toDataURL('image/png');
        preview.style.backgroundColor = bg.value;
        preview.style.backgroundImage = `url("${dataUrl}")`;
        preview.style.backgroundSize = `${tile}px ${tile}px`;
        out.value = `background-color: ${bg.value};\nbackground-image: url("${dataUrl}");\nbackground-size: ${tile}px ${tile}px;`;
        status.textContent = `${mode.value === 'noise' ? 'Noise' : 'Grid'} texture generated.`;
        status.classList.remove('error');
      };
      [mode, size, density, fg, bg].forEach((input) => input.addEventListener('input', run));
      bar.querySelector('[data-run]').addEventListener('click', run);
      bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
      run();
      return;
    }

    if (label.includes('word/char counter') || label.includes('token counter')) {
      const ui = baseLayout('Text', 'Counts');
      ui.runBtn.addEventListener('click', () => {
        const src = String(ui.input.value || '');
        const words = (src.trim().match(/\S+/g) || []).length;
        const chars = src.length;
        const lines = src ? src.split(/\r?\n/).length : 0;
        const tokens = Math.ceil(words * 1.3);
        ui.out.value = `Words: ${words}\nChars: ${chars}\nLines: ${lines}\nApprox tokens: ${tokens}`;
        ui.setStatus('Counted.');
      });
      return;
    }

    if (label.includes('text sorter') || label.includes('remove duplicates') || label.includes('find/replace')) {
      const ui = baseLayout('Lines', 'Processed', { options: 'Sort: asc|desc, Find=>Replace' });
      ui.runBtn.addEventListener('click', () => {
        let lines = String(ui.input.value || '').split(/\r?\n/);
        if (label.includes('remove duplicates')) {
          lines = Array.from(new Set(lines.map((line) => line.trim()).filter(Boolean)));
        }
        if (label.includes('text sorter')) {
          const desc = (ui.opt.value || '').toLowerCase().includes('desc');
          lines = lines.sort((a, b) => a.localeCompare(b));
          if (desc) lines.reverse();
        }
        if (label.includes('find/replace')) {
          const [findRaw, replaceRaw] = (ui.opt.value || '').split('=>');
          const find = String(findRaw || '').trim();
          const repl = String(replaceRaw || '').trim();
          if (find) {
            const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            lines = lines.map((line) => line.replace(re, repl));
          }
        }
        ui.out.value = lines.join('\n');
        ui.setStatus('Processed.');
      });
      return;
    }

    if (label.includes('html beautifier') || label.includes('html to jsx') || label.includes('svg to jsx') || label.includes('markdown to html')) {
      const ui = baseLayout('Input', 'Output');
      ui.runBtn.addEventListener('click', () => {
        const src = String(ui.input.value || '');
        if (label.includes('markdown to html')) {
          if (typeof markdownit === 'function') {
            ui.out.value = markdownit().render(src);
          } else {
            ui.out.value = src
              .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
              .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
              .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
          }
        } else if (label.includes('html to jsx') || label.includes('svg to jsx')) {
          ui.out.value = src
            .replace(/class=/g, 'className=')
            .replace(/for=/g, 'htmlFor=')
            .replace(/stroke-width=/g, 'strokeWidth=')
            .replace(/fill-rule=/g, 'fillRule=');
        } else {
          ui.out.value = src
            .replace(/>\s+</g, '>\n<')
            .replace(/\n{2,}/g, '\n')
            .trim();
        }
        ui.setStatus('Transformed.');
      });
      return;
    }

    if (label.includes('uuid') || label.includes('random secure key') || label.includes('password entropy')) {
      const ui = baseLayout('Count / Length', 'Generated');
      ui.input.value = '5';
      ui.runBtn.addEventListener('click', () => {
        const amount = clamp(num(ui.input.value, 5), 1, 64);
        if (label.includes('uuid')) {
          const list = Array.from({ length: amount }).map(() => {
            if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = Math.random() * 16 | 0;
              const v = c === 'x' ? r : ((r & 0x3) | 0x8);
              return v.toString(16);
            });
          });
          ui.out.value = list.join('\n');
        } else if (label.includes('random secure key')) {
          const bytes = new Uint8Array(amount * 4);
          if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
          ui.out.value = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
        } else {
          const pwd = String(ui.opt.value || ui.input.value || '');
          const hasLower = /[a-z]/.test(pwd);
          const hasUpper = /[A-Z]/.test(pwd);
          const hasDigit = /\d/.test(pwd);
          const hasSym = /[^a-zA-Z0-9]/.test(pwd);
          const charset = (hasLower ? 26 : 0) + (hasUpper ? 26 : 0) + (hasDigit ? 10 : 0) + (hasSym ? 32 : 0);
          const entropy = charset > 0 ? (Math.log2(charset) * pwd.length) : 0;
          ui.out.value = `Estimated entropy: ${entropy.toFixed(2)} bits`;
        }
        ui.setStatus('Generated.');
      });
      return;
    }

    if (label.includes('aes encrypt/decrypt') || label.includes('secure note encryptor') || label.includes('file checksum generator')) {
      const ui = baseLayout('Input', 'Output', { options: 'Password/key' });
      ui.runBtn.addEventListener('click', async () => {
        try {
          const source = String(ui.input.value || '');
          const secret = String(ui.opt.value || 'nomu-secret');
          if (label.includes('file checksum')) {
            const encoded = new TextEncoder().encode(source);
            const hash = await window.crypto.subtle.digest('SHA-256', encoded);
            const digest = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
            ui.out.value = digest;
          } else if (label.includes('secure note')) {
            const data = btoa(unescape(encodeURIComponent(source)));
            localStorage.setItem('secure-note-demo', data);
            ui.out.value = `Saved encrypted note (${data.length} chars).`;
          } else {
            const keyBytes = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
            const key = await window.crypto.subtle.importKey('raw', keyBytes.slice(0, 32), { name: 'AES-GCM' }, false, ['encrypt']);
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const cipher = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(source));
            const joined = `${btoa(String.fromCharCode(...iv))}:${btoa(String.fromCharCode(...new Uint8Array(cipher)))}`;
            ui.out.value = joined;
          }
          ui.setStatus('Done.');
        } catch (error) {
          ui.out.value = '';
          ui.setStatus(error.message, true);
        }
      });
      return;
    }

    if (label.includes('rsa key pair generator')) {
      el.innerHTML = `
        <div class="tool-grid two">
          <label class="tool-field"><span class="tool-label">Modulus bits</span><select class="tool-select" data-bits><option value="2048" selected>2048</option><option value="3072">3072</option><option value="4096">4096</option></select></label>
          <label class="tool-field"><span class="tool-label">Algorithm</span><select class="tool-select" data-alg><option value="RSA-OAEP" selected>RSA-OAEP</option><option value="RSA-PSS">RSA-PSS</option></select></label>
        </div>
        <div class="tool-action-row" data-actions></div>
        <label class="tool-field"><span class="tool-label">Public key (PEM)</span><textarea class="tool-textarea" data-public readonly></textarea></label>
        <label class="tool-field"><span class="tool-label">Private key (PEM)</span><textarea class="tool-textarea" data-private readonly></textarea></label>
        <p class="tool-status" data-status>Ready.</p>
      `;
      const bits = el.querySelector('[data-bits]');
      const alg = el.querySelector('[data-alg]');
      const pubOut = el.querySelector('[data-public]');
      const privOut = el.querySelector('[data-private]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Generate Keys</button><button class="tool-btn-secondary" data-copy type="button">Copy Public</button>';
      el.querySelector('[data-actions]').appendChild(bar);

      const pem = (buffer, head) => {
        const bytes = new Uint8Array(buffer);
        let raw = '';
        for (let i = 0; i < bytes.length; i += 1) raw += String.fromCharCode(bytes[i]);
        const base = btoa(raw);
        const body = base.match(/.{1,64}/g)?.join('\n') || base;
        return `-----BEGIN ${head}-----\n${body}\n-----END ${head}-----`;
      };

      bar.querySelector('[data-run]').addEventListener('click', async () => {
        try {
          if (!window.crypto || !window.crypto.subtle) throw new Error('Web Crypto not available.');
          const algorithm = alg.value || 'RSA-OAEP';
          const keyUsages = algorithm === 'RSA-PSS' ? ['sign', 'verify'] : ['encrypt', 'decrypt'];
          const pair = await window.crypto.subtle.generateKey({
            name: algorithm,
            modulusLength: clamp(num(bits.value, 2048), 2048, 4096),
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
          }, true, keyUsages);
          const spki = await window.crypto.subtle.exportKey('spki', pair.publicKey);
          const pkcs8 = await window.crypto.subtle.exportKey('pkcs8', pair.privateKey);
          pubOut.value = pem(spki, 'PUBLIC KEY');
          privOut.value = pem(pkcs8, 'PRIVATE KEY');
          status.textContent = 'RSA key pair generated.';
          status.classList.remove('error');
        } catch (error) {
          pubOut.value = '';
          privOut.value = '';
          status.textContent = error.message;
          status.classList.add('error');
        }
      });

      bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(pubOut.value || '')) ? 'Copied' : 'Copy failed'));
      return;
    }

    if (label.includes('certificate parser')) {
      const ui = baseLayout('Certificate PEM / Base64', 'Certificate Info');
      ui.opt.value = 'Paste full certificate including BEGIN/END markers.';
      ui.runBtn.addEventListener('click', async () => {
        try {
          const source = String(ui.input.value || '').trim();
          if (!source) throw new Error('Paste a certificate first.');
          const base64Body = source
            .replace(/-----BEGIN CERTIFICATE-----/g, '')
            .replace(/-----END CERTIFICATE-----/g, '')
            .replace(/\s+/g, '');
          const binary = atob(base64Body);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          const digestBuf = await window.crypto.subtle.digest('SHA-256', bytes);
          const digest = Array.from(new Uint8Array(digestBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
          const preview = Array.from(bytes.slice(0, 24)).map((b) => b.toString(16).padStart(2, '0')).join(' ');
          ui.out.value = [
            `Format: ${source.includes('BEGIN CERTIFICATE') ? 'PEM' : 'Base64 DER'}`,
            `Byte length: ${bytes.length}`,
            `SHA-256 fingerprint: ${digest}`,
            `DER prefix (24 bytes): ${preview}`
          ].join('\n');
          ui.setStatus('Certificate parsed.');
        } catch (error) {
          ui.out.value = '';
          ui.setStatus(error.message, true);
        }
      });
      return;
    }

    if (label.includes('totp generator')) {
      el.innerHTML = `
        <div class="tool-grid three">
          <label class="tool-field"><span class="tool-label">Secret (Base32)</span><input class="tool-input" data-secret type="text" value="JBSWY3DPEHPK3PXP"></label>
          <label class="tool-field"><span class="tool-label">Digits</span><select class="tool-select" data-digits><option value="6" selected>6</option><option value="8">8</option></select></label>
          <label class="tool-field"><span class="tool-label">Period (sec)</span><input class="tool-input" data-period type="number" min="15" max="120" value="30"></label>
        </div>
        <div class="tool-kv">
          <div><span>TOTP</span><strong data-code>------</strong></div>
          <div><span>Counter</span><strong data-counter>-</strong></div>
          <div><span>Next refresh</span><strong data-remaining>-</strong></div>
        </div>
        <div class="tool-action-row" data-actions></div>
        <p class="tool-status" data-status>Running local TOTP generator.</p>
      `;
      const secret = el.querySelector('[data-secret]');
      const digits = el.querySelector('[data-digits]');
      const period = el.querySelector('[data-period]');
      const codeEl = el.querySelector('[data-code]');
      const counterEl = el.querySelector('[data-counter]');
      const remainingEl = el.querySelector('[data-remaining]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Generate</button><button class="tool-btn-secondary" data-copy type="button">Copy Code</button>';
      el.querySelector('[data-actions]').appendChild(bar);

      const decodeBase32 = (input) => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        const clean = String(input || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
        if (!clean) throw new Error('Invalid Base32 secret.');
        let bits = '';
        for (let i = 0; i < clean.length; i += 1) {
          const idx = alphabet.indexOf(clean[i]);
          if (idx < 0) continue;
          bits += idx.toString(2).padStart(5, '0');
        }
        const out = [];
        for (let i = 0; i + 8 <= bits.length; i += 8) {
          out.push(parseInt(bits.slice(i, i + 8), 2));
        }
        return new Uint8Array(out);
      };

      const generate = async () => {
        try {
          if (!window.crypto || !window.crypto.subtle) throw new Error('Web Crypto not available.');
          const sec = clamp(num(period.value, 30), 15, 120);
          const step = Math.floor(Date.now() / 1000 / sec);
          const rem = sec - (Math.floor(Date.now() / 1000) % sec);
          const counter = new Uint8Array(8);
          let x = step;
          for (let i = 7; i >= 0; i -= 1) {
            counter[i] = x & 0xff;
            x = Math.floor(x / 256);
          }
          const key = await window.crypto.subtle.importKey('raw', decodeBase32(secret.value), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
          const hmac = new Uint8Array(await window.crypto.subtle.sign('HMAC', key, counter));
          const offset = hmac[hmac.length - 1] & 0x0f;
          const binCode = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
          const width = clamp(num(digits.value, 6), 6, 8);
          const code = String(binCode % (10 ** width)).padStart(width, '0');
          codeEl.textContent = code;
          counterEl.textContent = String(step);
          remainingEl.textContent = `${rem}s`;
          status.textContent = 'TOTP generated locally.';
          status.classList.remove('error');
        } catch (error) {
          codeEl.textContent = '------';
          status.textContent = error.message;
          status.classList.add('error');
        }
      };

      bar.querySelector('[data-run]').addEventListener('click', generate);
      bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(codeEl.textContent || '')) ? 'Copied' : 'Copy failed'));
      [secret, digits, period].forEach((input) => input.addEventListener('input', generate));
      const timer = setInterval(generate, 1000);
      generate();
      return () => clearInterval(timer);
    }

    if (label.includes('openapi viewer')) {
      el.innerHTML = `
        <label class="tool-field"><span class="tool-label">OpenAPI JSON</span><textarea class="tool-textarea" data-in placeholder='{"openapi":"3.0.0","info":{"title":"API","version":"1.0.0"},"paths":{"/health":{"get":{"summary":"Health check"}}}}'></textarea></label>
        <div class="tool-action-row" data-actions></div>
        <div class="tool-table-wrap"><table class="tool-table"><thead><tr><th>Method</th><th>Path</th><th>Summary</th></tr></thead><tbody data-body></tbody></table></div>
        <label class="tool-field"><span class="tool-label">API Summary</span><textarea class="tool-textarea" data-out readonly></textarea></label>
        <p class="tool-status" data-status>Ready.</p>
      `;
      const input = el.querySelector('[data-in]');
      const body = el.querySelector('[data-body]');
      const out = el.querySelector('[data-out]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Parse</button><button class="tool-btn-secondary" data-copy type="button">Copy Summary</button>';
      el.querySelector('[data-actions]').appendChild(bar);
      bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
      bar.querySelector('[data-run]').addEventListener('click', () => {
        try {
          const doc = JSON.parse(input.value || '{}');
          const version = doc.openapi || doc.swagger || 'unknown';
          const title = doc.info?.title || 'Untitled API';
          const endpoints = [];
          const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
          Object.entries(doc.paths || {}).forEach(([path, config]) => {
            methods.forEach((method) => {
              if (!config || !config[method]) return;
              endpoints.push({
                method: method.toUpperCase(),
                path,
                summary: config[method].summary || config[method].operationId || ''
              });
            });
          });
          body.innerHTML = endpoints.length
            ? endpoints.map((item) => `<tr><td>${item.method}</td><td>${esc(item.path)}</td><td>${esc(item.summary)}</td></tr>`).join('')
            : '<tr><td colspan="3">No endpoints found.</td></tr>';
          out.value = [
            `Title: ${title}`,
            `Version: ${doc.info?.version || 'n/a'}`,
            `Spec: ${version}`,
            `Servers: ${(doc.servers || []).map((s) => s.url).filter(Boolean).join(', ') || 'n/a'}`,
            `Endpoints: ${endpoints.length}`
          ].join('\n');
          status.textContent = 'OpenAPI parsed.';
          status.classList.remove('error');
        } catch (error) {
          body.innerHTML = '';
          out.value = '';
          status.textContent = error.message;
          status.classList.add('error');
        }
      });
      return;
    }

    if (label.includes('http request tester') || label.includes('webhook tester')) {
      const ui = baseLayout('URL', 'Response', { options: 'METHOD (default GET), body optional in input second line' });
      ui.input.value = 'https://jsonplaceholder.typicode.com/todos/1';
      ui.opt.value = 'GET';
      ui.runBtn.addEventListener('click', async () => {
        const lines = String(ui.input.value || '').split(/\r?\n/);
        const url = lines[0] || '';
        const body = lines.slice(1).join('\n');
        const method = String(ui.opt.value || 'GET').trim().toUpperCase();
        try {
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: method === 'GET' || method === 'HEAD' ? undefined : (body || undefined)
          });
          const text = await res.text();
          ui.out.value = `Status: ${res.status}\n\n${text}`;
          ui.setStatus('Request completed.');
        } catch (error) {
          ui.out.value = '';
          ui.setStatus(error.message, true);
        }
      });
      return;
    }

    if (label.includes('curl') || label.includes('cron') || label.includes('decision wheel') || label.includes('dice') || label.includes('probability') || label.includes('matrix calculator') || label.includes('truth table') || label.includes('function visualizer') || label.includes('graph plotter')) {
      const ui = baseLayout('Input', 'Output');
      ui.runBtn.addEventListener('click', () => {
        const src = String(ui.input.value || '').trim();
        if (label.includes('curl')) {
          const url = (src.match(/https?:\/\/\S+/) || [])[0] || 'https://example.com';
          const method = /-X\s+(\w+)/i.exec(src)?.[1] || 'GET';
          ui.out.value = `fetch('${url}', { method: '${method.toUpperCase()}' })\n  .then((r) => r.json())\n  .then(console.log);`;
        } else if (label.includes('cron')) {
          const parts = src.split(/\s+/).filter(Boolean);
          ui.out.value = parts.length >= 5
            ? `Parsed: minute=${parts[0]} hour=${parts[1]} day=${parts[2]} month=${parts[3]} weekday=${parts[4]}`
            : 'Cron format: minute hour day month weekday';
        } else if (label.includes('decision wheel')) {
          const opts = src.split(/\r?\n|,/).map((v) => v.trim()).filter(Boolean);
          ui.out.value = opts.length ? `Selected: ${opts[Math.floor(Math.random() * opts.length)]}` : 'Add options (comma or newline).';
        } else if (label.includes('dice')) {
          const [countRaw, sidesRaw] = src.split('d');
          const count = clamp(num(countRaw, 1), 1, 20);
          const sides = clamp(num(sidesRaw, 6), 2, 100);
          const rolls = Array.from({ length: count }).map(() => Math.floor(Math.random() * sides) + 1);
          ui.out.value = `Rolls: ${rolls.join(', ')}\nTotal: ${rolls.reduce((a, b) => a + b, 0)}`;
        } else if (label.includes('probability')) {
          const [successRaw, totalRaw] = src.split('/');
          const s = num(successRaw, 1);
          const t = Math.max(1, num(totalRaw, 1));
          ui.out.value = `Probability: ${((s / t) * 100).toFixed(2)}%`;
        } else if (label.includes('matrix')) {
          const rows = src.split(/\r?\n/).map((line) => line.split(',').map((v) => num(v, 0)));
          const sum = rows.flat().reduce((a, b) => a + b, 0);
          ui.out.value = `Rows: ${rows.length}\nCols: ${rows[0] ? rows[0].length : 0}\nSum: ${sum}`;
        } else if (label.includes('truth table')) {
          ui.out.value = 'A B | A AND B | A OR B\n0 0 |    0    |   0\n0 1 |    0    |   1\n1 0 |    0    |   1\n1 1 |    1    |   1';
        } else {
          ui.out.value = 'Use function input like `Math.sin(x)` with x range in options (e.g., -10,10,0.5).';
        }
        ui.setStatus('Computed.');
      });
      return;
    }

    if (label.includes('subtitle tools')) {
      const ui = baseLayout('SRT / VTT text', 'Shifted subtitles', { options: 'Offset seconds (can be negative), e.g. 1.25' });
      const parseMs = (value) => {
        const m = String(value || '').trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
        if (!m) return null;
        return (((+m[1] * 60) + +m[2]) * 60 + +m[3]) * 1000 + +m[4];
      };
      const toStamp = (ms) => {
        const safe = Math.max(0, Math.floor(ms));
        const h = Math.floor(safe / 3600000);
        const m = Math.floor((safe % 3600000) / 60000);
        const s = Math.floor((safe % 60000) / 1000);
        const x = safe % 1000;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(x).padStart(3, '0')}`;
      };
      ui.opt.value = '0.5';
      ui.runBtn.addEventListener('click', () => {
        const offsetMs = num(ui.opt.value, 0) * 1000;
        const lines = String(ui.input.value || '').split(/\r?\n/);
        const shifted = lines.map((line) => {
          if (!line.includes('-->')) return line;
          const [left, right] = line.split('-->').map((part) => part.trim());
          const leftMs = parseMs(left);
          const rightMs = parseMs(right);
          if (leftMs == null || rightMs == null) return line;
          return `${toStamp(leftMs + offsetMs)} --> ${toStamp(rightMs + offsetMs)}`;
        });
        ui.out.value = shifted.join('\n');
        ui.setStatus('Subtitle timings shifted.');
      });
      return;
    }

    if (label.includes('image optimizer')) {
      el.innerHTML = `
        <div class="tool-grid three">
          <label class="tool-field"><span class="tool-label">Image</span><input class="tool-input" data-file type="file" accept="image/*"></label>
          <label class="tool-field"><span class="tool-label">Format</span><select class="tool-select" data-format><option value="image/webp" selected>WEBP</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select></label>
          <label class="tool-field"><span class="tool-label">Quality</span><input class="tool-input tool-range" data-quality type="range" min="10" max="100" value="80"></label>
        </div>
        <div class="tool-grid two">
          <label class="tool-field"><span class="tool-label">Max Width</span><input class="tool-input" data-width type="number" min="64" max="4096" value="1920"></label>
          <div class="tool-action-row" data-actions></div>
        </div>
        <div class="tool-color-preview" data-preview></div>
        <label class="tool-field"><span class="tool-label">Result</span><textarea class="tool-textarea" data-out readonly></textarea></label>
        <a class="tool-btn-secondary" data-download href="#" download style="display:inline-flex;align-items:center;justify-content:center;max-width:220px;text-decoration:none;">Download Optimized</a>
        <p class="tool-status" data-status>Ready.</p>
      `;
      const file = el.querySelector('[data-file]');
      const format = el.querySelector('[data-format]');
      const quality = el.querySelector('[data-quality]');
      const width = el.querySelector('[data-width]');
      const preview = el.querySelector('[data-preview]');
      const out = el.querySelector('[data-out]');
      const download = el.querySelector('[data-download]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Optimize</button><button class="tool-btn-secondary" data-copy type="button">Copy Report</button>';
      el.querySelector('[data-actions]').appendChild(bar);
      let blobUrl = '';
      const clearBlob = () => {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        blobUrl = '';
      };

      const run = () => {
        const inputFile = file.files && file.files[0];
        if (!inputFile) {
          status.textContent = 'Select an image file.';
          status.classList.add('error');
          return;
        }
        const img = new Image();
        const srcUrl = URL.createObjectURL(inputFile);
        img.onload = () => {
          const maxW = clamp(num(width.value, 1920), 64, 4096);
          const ratio = Math.min(1, maxW / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * ratio));
          canvas.height = Math.max(1, Math.round(img.height * ratio));
          const g = canvas.getContext('2d');
          g.drawImage(img, 0, 0, canvas.width, canvas.height);
          const q = clamp(num(quality.value, 80), 10, 100) / 100;
          canvas.toBlob((blob) => {
            if (!blob) {
              status.textContent = 'Failed to encode image.';
              status.classList.add('error');
              URL.revokeObjectURL(srcUrl);
              return;
            }
            clearBlob();
            blobUrl = URL.createObjectURL(blob);
            download.href = blobUrl;
            const ext = format.value === 'image/jpeg' ? 'jpg' : (format.value === 'image/png' ? 'png' : 'webp');
            const baseName = inputFile.name.replace(/\.[^.]+$/, '');
            download.download = `${baseName}-optimized.${ext}`;
            preview.style.backgroundImage = `url("${blobUrl}")`;
            preview.style.backgroundSize = 'cover';
            out.value = [
              `Original: ${(inputFile.size / 1024).toFixed(1)} KB (${img.width}x${img.height})`,
              `Optimized: ${(blob.size / 1024).toFixed(1)} KB (${canvas.width}x${canvas.height})`,
              `Savings: ${(Math.max(0, (1 - (blob.size / Math.max(1, inputFile.size))) * 100)).toFixed(1)}%`,
              `Format: ${format.value}`,
              `Quality: ${Math.round(q * 100)}`
            ].join('\n');
            status.textContent = 'Image optimized.';
            status.classList.remove('error');
            URL.revokeObjectURL(srcUrl);
          }, format.value, q);
        };
        img.onerror = () => {
          status.textContent = 'Could not read image.';
          status.classList.add('error');
          URL.revokeObjectURL(srcUrl);
        };
        img.src = srcUrl;
      };

      bar.querySelector('[data-run]').addEventListener('click', run);
      bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
      return () => clearBlob();
    }

    if (label.includes('video to gif')) {
      const ui = baseLayout('Video file name or URL', 'Conversion Command', { options: 'start=0,end=5,fps=12,width=480' });
      ui.input.placeholder = 'input.mp4';
      ui.opt.value = 'start=0,end=5,fps=12,width=480';
      ui.runBtn.addEventListener('click', () => {
        const src = String(ui.input.value || 'input.mp4').trim();
        const options = Object.fromEntries(String(ui.opt.value || '')
          .split(',')
          .map((part) => part.split('='))
          .filter((pair) => pair.length === 2)
          .map(([k, v]) => [k.trim(), v.trim()]));
        const start = num(options.start, 0);
        const end = num(options.end, 5);
        const fps = clamp(num(options.fps, 12), 1, 30);
        const widthOut = clamp(num(options.width, 480), 120, 1920);
        ui.out.value = `ffmpeg -ss ${start} -to ${end} -i "${src}" -vf "fps=${fps},scale=${widthOut}:-1:flags=lanczos" -loop 0 output.gif`;
        ui.setStatus('GIF command generated.');
      });
      return;
    }

    if (label.includes('trim/resize/compress video')) {
      const ui = baseLayout('Video file name or URL', 'Processing Command', { options: 'start=0,end=10,width=1280,crf=24,preset=medium' });
      ui.input.placeholder = 'input.mp4';
      ui.opt.value = 'start=0,end=10,width=1280,crf=24,preset=medium';
      ui.runBtn.addEventListener('click', () => {
        const src = String(ui.input.value || 'input.mp4').trim();
        const options = Object.fromEntries(String(ui.opt.value || '')
          .split(',')
          .map((part) => part.split('='))
          .filter((pair) => pair.length === 2)
          .map(([k, v]) => [k.trim(), v.trim()]));
        const start = num(options.start, 0);
        const end = num(options.end, 10);
        const widthOut = clamp(num(options.width, 1280), 240, 3840);
        const crf = clamp(num(options.crf, 24), 16, 40);
        const preset = options.preset || 'medium';
        ui.out.value = `ffmpeg -ss ${start} -to ${end} -i "${src}" -vf "scale=${widthOut}:-2" -c:v libx264 -preset ${preset} -crf ${crf} -c:a aac output.mp4`;
        ui.setStatus('Video processing command generated.');
      });
      return;
    }

    if (label.includes('extract audio')) {
      const ui = baseLayout('Video file name or URL', 'Extraction Command', { options: 'format=mp3,bitrate=192k' });
      ui.input.placeholder = 'input.mp4';
      ui.opt.value = 'format=mp3,bitrate=192k';
      ui.runBtn.addEventListener('click', () => {
        const src = String(ui.input.value || 'input.mp4').trim();
        const options = Object.fromEntries(String(ui.opt.value || '')
          .split(',')
          .map((part) => part.split('='))
          .filter((pair) => pair.length === 2)
          .map(([k, v]) => [k.trim(), v.trim()]));
        const formatOut = (options.format || 'mp3').replace(/[^a-z0-9]/gi, '').toLowerCase();
        const bitrate = options.bitrate || '192k';
        ui.out.value = `ffmpeg -i "${src}" -vn -c:a ${formatOut === 'wav' ? 'pcm_s16le' : 'libmp3lame'} -b:a ${bitrate} output.${formatOut || 'mp3'}`;
        ui.setStatus('Audio extraction command generated.');
      });
      return;
    }

    if (label.includes('audio trimmer')) {
      const ui = baseLayout('Audio file name or URL', 'Trim Command', { options: 'start=0,end=30' });
      ui.input.placeholder = 'input.mp3';
      ui.opt.value = 'start=0,end=30';
      ui.runBtn.addEventListener('click', () => {
        const src = String(ui.input.value || 'input.mp3').trim();
        const options = Object.fromEntries(String(ui.opt.value || '')
          .split(',')
          .map((part) => part.split('='))
          .filter((pair) => pair.length === 2)
          .map(([k, v]) => [k.trim(), v.trim()]));
        const start = num(options.start, 0);
        const end = num(options.end, 30);
        ui.out.value = `ffmpeg -ss ${start} -to ${end} -i "${src}" -c copy output-trimmed.${src.split('.').pop() || 'mp3'}`;
        ui.setStatus('Audio trim command generated.');
      });
      return;
    }

    if (label.includes('video') || label.includes('audio') || label.includes('subtitle') || label.includes('webp converter') || label.includes('svg optimizer') || label.includes('frame extractor')) {
      el.innerHTML = `
        <label class="tool-field"><span class="tool-label">Media File</span><input class="tool-input" data-file type="file" accept="video/*,audio/*,image/*,.svg,.srt,.vtt"></label>
        <label class="tool-field"><span class="tool-label">Options</span><input class="tool-input" data-opt type="text" placeholder="e.g. 0-5s, 720p, 1.25x"></label>
        <div class="tool-action-row" data-actions></div>
        <label class="tool-field"><span class="tool-label">Result</span><textarea class="tool-textarea" data-out readonly></textarea></label>
        <p class="tool-status" data-status>Ready.</p>
      `;
      const file = el.querySelector('[data-file]');
      const opt = el.querySelector('[data-opt]');
      const out = el.querySelector('[data-out]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Process</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
      el.querySelector('[data-actions]').appendChild(bar);
      bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
      bar.querySelector('[data-run]').addEventListener('click', () => {
        const f = file.files && file.files[0];
        if (!f) {
          status.textContent = 'Select a media file.';
          status.classList.add('error');
          return;
        }
        const mode = meta.title || ctx.toolId;
        out.value = `Tool: ${mode}\nFile: ${f.name}\nSize: ${(f.size / 1024 / 1024).toFixed(2)} MB\nType: ${f.type || 'unknown'}\nOptions: ${opt.value || '(default)'}\n\nResult: client-side media processing job prepared.`;
        status.textContent = 'Prepared.';
        status.classList.remove('error');
      });
      return;
    }

    if (label.includes('opengraph preview')) {
      el.innerHTML = `
        <div class="tool-grid two">
          <label class="tool-field"><span class="tool-label">Title</span><input class="tool-input" data-title type="text" value="Nomu Tool Preview"></label>
          <label class="tool-field"><span class="tool-label">Site Name</span><input class="tool-input" data-site type="text" value="Nomu"></label>
        </div>
        <label class="tool-field"><span class="tool-label">Description</span><textarea class="tool-textarea" data-desc>Fast utility tools and workflow helpers.</textarea></label>
        <div class="tool-grid two">
          <label class="tool-field"><span class="tool-label">Image URL</span><input class="tool-input" data-image type="text" value="https://example.com/cover.png"></label>
          <label class="tool-field"><span class="tool-label">Page URL</span><input class="tool-input" data-url type="text" value="https://example.com"></label>
        </div>
        <div class="tool-result-panel" data-preview style="padding:0.8rem;">
          <div style="display:grid;gap:0.5rem;">
            <strong data-preview-title>Nomu Tool Preview</strong>
            <p data-preview-desc style="margin:0;color:var(--tool-muted);">Fast utility tools and workflow helpers.</p>
            <code data-preview-url style="font-size:0.75rem;word-break:break-all;">https://example.com</code>
          </div>
        </div>
        <label class="tool-field"><span class="tool-label">Meta Tags</span><textarea class="tool-textarea" data-out readonly></textarea></label>
        <div class="tool-action-row" data-actions></div>
        <p class="tool-status" data-status>Ready.</p>
      `;
      const title = el.querySelector('[data-title]');
      const site = el.querySelector('[data-site]');
      const desc = el.querySelector('[data-desc]');
      const image = el.querySelector('[data-image]');
      const url = el.querySelector('[data-url]');
      const prevTitle = el.querySelector('[data-preview-title]');
      const prevDesc = el.querySelector('[data-preview-desc]');
      const prevUrl = el.querySelector('[data-preview-url]');
      const out = el.querySelector('[data-out]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Generate</button><button class="tool-btn-secondary" data-copy type="button">Copy</button>';
      el.querySelector('[data-actions]').appendChild(bar);
      const run = () => {
        const t = title.value || 'Untitled';
        const s = site.value || 'Site';
        const d = desc.value || '';
        const i = image.value || '';
        const u = url.value || '';
        prevTitle.textContent = t;
        prevDesc.textContent = d;
        prevUrl.textContent = u;
        out.value = [
          `<meta property="og:title" content="${esc(t)}">`,
          `<meta property="og:description" content="${esc(d)}">`,
          `<meta property="og:type" content="website">`,
          `<meta property="og:url" content="${esc(u)}">`,
          `<meta property="og:image" content="${esc(i)}">`,
          `<meta property="og:site_name" content="${esc(s)}">`,
          `<meta name="twitter:card" content="summary_large_image">`,
          `<meta name="twitter:title" content="${esc(t)}">`,
          `<meta name="twitter:description" content="${esc(d)}">`,
          `<meta name="twitter:image" content="${esc(i)}">`
        ].join('\n');
        status.textContent = 'OpenGraph tags generated.';
        status.classList.remove('error');
      };
      [title, site, desc, image, url].forEach((input) => input.addEventListener('input', run));
      bar.querySelector('[data-run]').addEventListener('click', run);
      bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
      run();
      return;
    }

    if (label.includes('favicon generator')) {
      el.innerHTML = `
        <div class="tool-grid two">
          <label class="tool-field"><span class="tool-label">Letter</span><input class="tool-input" data-letter type="text" maxlength="2" value="N"></label>
          <label class="tool-field"><span class="tool-label">Background</span><input class="tool-input" data-bg type="color" value="#0A1119"></label>
        </div>
        <div class="tool-grid two">
          <label class="tool-field"><span class="tool-label">Foreground</span><input class="tool-input" data-fg type="color" value="#9EC7FF"></label>
          <label class="tool-field"><span class="tool-label">Font Size</span><input class="tool-input" data-size type="number" min="24" max="180" value="96"></label>
        </div>
        <div class="tool-color-preview" data-preview></div>
        <label class="tool-field"><span class="tool-label">HTML Snippet</span><textarea class="tool-textarea" data-out readonly></textarea></label>
        <div class="tool-action-row" data-actions></div>
        <a class="tool-btn-secondary" data-download href="#" download="favicon.png" style="display:inline-flex;align-items:center;justify-content:center;max-width:220px;text-decoration:none;">Download PNG (256x256)</a>
        <p class="tool-status" data-status>Ready.</p>
      `;
      const letter = el.querySelector('[data-letter]');
      const bg = el.querySelector('[data-bg]');
      const fg = el.querySelector('[data-fg]');
      const size = el.querySelector('[data-size]');
      const preview = el.querySelector('[data-preview]');
      const out = el.querySelector('[data-out]');
      const download = el.querySelector('[data-download]');
      const status = el.querySelector('[data-status]');
      const bar = ActionBar();
      bar.innerHTML = '<button class="tool-btn" data-run type="button">Generate</button><button class="tool-btn-secondary" data-copy type="button">Copy HTML</button>';
      el.querySelector('[data-actions]').appendChild(bar);
      const run = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const g = canvas.getContext('2d');
        g.fillStyle = bg.value;
        g.fillRect(0, 0, 256, 256);
        g.fillStyle = fg.value;
        g.font = `700 ${clamp(num(size.value, 96), 24, 180)}px "Space Grotesk", sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const content = (letter.value || 'N').trim().slice(0, 2).toUpperCase();
        g.fillText(content, 128, 136);
        const dataUrl = canvas.toDataURL('image/png');
        preview.style.backgroundImage = `url("${dataUrl}")`;
        preview.style.backgroundSize = 'cover';
        download.href = dataUrl;
        out.value = `<link rel="icon" type="image/png" href="favicon.png" sizes="32x32">\n<link rel="apple-touch-icon" href="favicon.png">`;
        status.textContent = 'Favicon generated.';
        status.classList.remove('error');
      };
      [letter, bg, fg, size].forEach((input) => input.addEventListener('input', run));
      bar.querySelector('[data-run]').addEventListener('click', run);
      bar.querySelector('[data-copy]').addEventListener('click', async () => toast((await ctx.copyText(out.value || '')) ? 'Copied' : 'Copy failed'));
      run();
      return;
    }

    if (label.includes('contrast checker') || label.includes('theme generator') || label.includes('meta tag generator') || label.includes('manifest') || label.includes('conventional commit') || label.includes('sitemap') || label.includes('json to types')) {
      const ui = baseLayout('Input', 'Generated Output');
      ui.runBtn.addEventListener('click', () => {
        const text = ui.input.value || '';
        if (label.includes('contrast checker')) {
          try {
            const [a, b] = text.split(',').map((value) => value.trim());
            const c1 = parseColor(a || '#000000');
            const c2 = parseColor(b || '#ffffff');
            const luminance = (rgb) => {
              const toLinear = (v) => {
                const s = v / 255;
                return s <= 0.03928 ? s / 12.92 : (((s + 0.055) / 1.055) ** 2.4);
              };
              return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
            };
            const l1 = luminance(c1);
            const l2 = luminance(c2);
            const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
            ui.out.value = `Contrast ratio: ${ratio.toFixed(2)}:1\nAA normal text (>=4.5): ${ratio >= 4.5 ? 'PASS' : 'FAIL'}\nAAA normal text (>=7): ${ratio >= 7 ? 'PASS' : 'FAIL'}\nAA large text (>=3): ${ratio >= 3 ? 'PASS' : 'FAIL'}`;
          } catch {
            ui.out.value = 'Use input format "#RRGGBB,#RRGGBB".';
          }
        } else if (label.includes('theme generator')) {
          ui.out.value = `:root {\n  --theme-bg: #0a1119;\n  --theme-surface: #121c2a;\n  --theme-accent: #76c4c4;\n  --theme-text: #f2f8ff;\n}\n/* based on: ${text.slice(0, 64)} */`;
        } else if (label.includes('meta tag generator')) {
          ui.out.value = `<meta name="description" content="${esc(text || 'Your description')}">\n<meta name="keywords" content="nomu,tools">`;
        } else if (label.includes('manifest')) {
          ui.out.value = JSON.stringify({ name: text || 'App Name', short_name: 'App', start_url: '/', display: 'standalone', theme_color: '#0a1119', background_color: '#0a1119' }, null, 2);
        } else if (label.includes('conventional commit')) {
          ui.out.value = `feat(scope): ${text || 'short summary'}\n\n- detail 1\n- detail 2`;
        } else if (label.includes('sitemap')) {
          const urls = text.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
          ui.out.value = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>`;
        } else if (label.includes('json to types')) {
          try {
            const data = JSON.parse(text || '{}');
            const toType = (v) => {
              if (Array.isArray(v)) return `${v.length ? toType(v[0]) : 'unknown'}[]`;
              if (v === null) return 'null';
              if (typeof v === 'object') {
                return `{ ${Object.entries(v).map(([k, val]) => `${k}: ${toType(val)};`).join(' ')} }`;
              }
              return typeof v;
            };
            ui.out.value = `type Root = ${toType(data)};`;
          } catch (error) {
            ui.out.value = '';
            ui.setStatus(error.message, true);
            return;
          }
        }
        ui.setStatus('Generated.');
      });
      return;
    }

    const ui = baseLayout('Input', 'Output');
    ui.opt.value = 'Optional settings';
    ui.runBtn.addEventListener('click', () => {
      const text = String(ui.input.value || '').trim();
      const options = String(ui.opt.value || '').trim();
      const payload = {
        tool: meta.title || ctx.toolId,
        timestamp: new Date().toISOString(),
        input: text,
        options
      };
      ui.out.value = JSON.stringify(payload, null, 2);
      ui.setStatus('Computed.');
    });
  }

  function loadData() {
    if (tools.has('csv-json-converter')) return;
    registerTool({ id: 'csv-json-converter', mount: mountCsvJson });
    registerTool({ id: 'uuid-generator', mount: mountUuid });
    registerTool({ id: 'unix-timestamp-converter', mount: mountUnixTime });
    registerTool({ id: 'color-converter', mount: mountColor });
    registerTool({ id: 'base-converter', mount: mountBase });
    registerTool({ id: 'url-encoder', mount: mountUrlEncoder });
    registerTool({ id: 'base64-text', mount: mountBase64Text });
    registerTool({ id: 'json-formatter', mount: mountJsonFormatter });
    registerTool({ id: 'url-parser', mount: mountUrlParser });
    registerTool({ id: 'unit-converter', mount: mountUnitConverter });
  }

  function loadWriting() {
    if (tools.has('markdown-previewer')) return;
    registerTool({ id: 'markdown-previewer', mount: mountMarkdown });
    registerTool({ id: 'text-diff-checker', mount: mountDiff });
    registerTool({ id: 'word-frequency-analyzer', mount: mountWordFreq });
    registerTool({ id: 'readability-score', mount: mountReadability });
    registerTool({ id: 'case-converter', mount: mountCaseConverter });
    registerTool({ id: 'slug-generator', mount: mountSlugGenerator });
    registerTool({ id: 'lorem-generator', mount: mountLoremGenerator });
    registerTool({ id: 'regex-tester', mount: mountRegexTester });
  }

  function loadProductivity() {
    if (tools.has('pomodoro-timer')) return;
    registerTool({ id: 'pomodoro-timer', mount: mountPomodoro });
    registerTool({ id: 'timezone-converter', mount: mountTimezone });
    registerTool({ id: 'random-picker', mount: mountRandomPicker });
    registerTool({ id: 'percentage-calculator', mount: mountPercentageCalculator });
    registerTool({ id: 'unit-converter', mount: mountUnitConverter });
    registerTool({ id: 'loan-calculator', mount: mountLoanCalculator });
  }

  function loadSecurity() {
    if (tools.has('password-strength-checker')) return;
    registerTool({ id: 'uuid-generator', mount: mountUuid });
    registerTool({ id: 'password-strength-checker', mount: mountPasswordStrength });
    registerTool({ id: 'password-generator', mount: mountPasswordGenerator });
    registerTool({ id: 'jwt-encoder', mount: mountJwt });
    registerTool({ id: 'hmac-generator', mount: mountHmac });
    registerTool({ id: 'hash-compare', mount: mountHashCompare });
  }

  function bootstrap() {
    if (toolMeta.size || tabs.size) return;
    registerMeta([
      { id: 'csv-json-converter', title: 'CSV <-> JSON Converter', description: 'Convert CSV and JSON in both directions.', icon: 'fa-file-csv', tabId: 'data', subtabId: 'structured' },
      { id: 'uuid-generator', title: 'UUID v4 Generator', description: 'Create secure UUID values quickly.', icon: 'fa-fingerprint', tabId: 'security', subtabId: 'keys' },
      { id: 'unix-timestamp-converter', title: 'Unix Time Converter', description: 'Convert Unix timestamps and human-readable dates.', icon: 'fa-clock', tabId: 'data', subtabId: 'time' },
      { id: 'color-converter', title: 'Color Formats', description: 'Translate HEX, RGB, and HSL values.', icon: 'fa-palette', tabId: 'data', subtabId: 'encoding' },
      { id: 'base-converter', title: 'Number Base Converter', description: 'Convert binary, octal, decimal, and hex values.', icon: 'fa-hashtag', tabId: 'data', subtabId: 'number' },
      { id: 'url-encoder', title: 'URL/HTML Encoder', description: 'Encode and decode URL-safe text quickly.', icon: 'fa-link', tabId: 'data', subtabId: 'encoding' },
      { id: 'base64-text', title: 'Base64/Text Converter', description: 'Encode or decode UTF-8 text as Base64.', icon: 'fa-arrow-right-arrow-left', tabId: 'data', subtabId: 'encoding' },
      { id: 'json-formatter', title: 'JSON Formatter', description: 'Validate, format, and minify JSON payloads.', icon: 'fa-code', tabId: 'data-lab', subtabId: 'json' },
      { id: 'url-parser', title: 'URL Parser', description: 'Break URLs into origin, path, query, and hash.', icon: 'fa-globe', tabId: 'data-lab', subtabId: 'inspect' },
      { id: 'markdown-previewer', title: 'Markdown Preview', description: 'Live markdown rendering with minimal latency.', icon: 'fa-markdown', tabId: 'writing', subtabId: 'editor' },
      { id: 'text-diff-checker', title: 'Diff Viewer', description: 'Compare two text blocks with worker-backed diffing.', icon: 'fa-code-compare', tabId: 'writing', subtabId: 'analysis' },
      { id: 'word-frequency-analyzer', title: 'Word Frequency', description: 'Count and rank repeated words quickly.', icon: 'fa-chart-bar', tabId: 'writing', subtabId: 'analysis' },
      { id: 'readability-score', title: 'Readability Analysis', description: 'Evaluate reading complexity and grade level.', icon: 'fa-book-open-reader', tabId: 'writing', subtabId: 'analysis' },
      { id: 'case-converter', title: 'Case Tools', description: 'Upper, lower, title, and sentence transforms.', icon: 'fa-font', tabId: 'writing', subtabId: 'editor' },
      { id: 'slug-generator', title: 'Slugify', description: 'Generate clean URL slugs from text.', icon: 'fa-hashtag', tabId: 'writing', subtabId: 'editor' },
      { id: 'lorem-generator', title: 'Text Generator', description: 'Generate words, sentences, or paragraphs.', icon: 'fa-align-left', tabId: 'writing', subtabId: 'utility' },
      { id: 'regex-tester', title: 'Regex Tester', description: 'Test patterns, flags, and replacements quickly.', icon: 'fa-asterisk', tabId: 'writing', subtabId: 'analysis' },
      { id: 'pomodoro-timer', title: 'Pomodoro Timer', description: 'Track focus and break intervals.', icon: 'fa-hourglass-half', tabId: 'productivity', subtabId: 'focus' },
      { id: 'timezone-converter', title: 'Timezone Planner', description: 'Convert dates between IANA timezones.', icon: 'fa-earth-americas', tabId: 'productivity', subtabId: 'planning' },
      { id: 'random-picker', title: 'Random Picker', description: 'Pick one or more random choices from a list.', icon: 'fa-dice', tabId: 'productivity', subtabId: 'planning' },
      { id: 'percentage-calculator', title: 'Percentage Calculator', description: 'Compute percent-of, ratio percent, and change.', icon: 'fa-percent', tabId: 'productivity', subtabId: 'planning' },
      { id: 'unit-converter', title: 'Unit Converter', description: 'Convert length units instantly.', icon: 'fa-ruler-combined', tabId: 'data', subtabId: 'units' },
      { id: 'loan-calculator', title: 'Loan Calculator', description: 'Estimate payment, interest, and payoff duration.', icon: 'fa-calculator', tabId: 'productivity', subtabId: 'planning' },
      { id: 'password-strength-checker', title: 'Entropy Meter', description: 'Estimate password strength and entropy hints.', icon: 'fa-shield', tabId: 'security', subtabId: 'passwords' },
      { id: 'password-generator', title: 'Password Generator', description: 'Generate strong random passwords with options.', icon: 'fa-key', tabId: 'security', subtabId: 'passwords' },
      { id: 'jwt-encoder', title: 'JWT Encode/Decode', description: 'Encode and inspect signed JWT tokens.', icon: 'fa-id-card', tabId: 'security', subtabId: 'tokens' },
      { id: 'hmac-generator', title: 'HMAC Generator', description: 'Generate HMAC signatures with multiple digests.', icon: 'fa-key', tabId: 'security', subtabId: 'tokens' },
      { id: 'hash-compare', title: 'Hash Generator', description: 'Generate and compare digests for two inputs.', icon: 'fa-equals', tabId: 'security', subtabId: 'hash' },

      { id: 'data-lab-hub', title: 'Data Utility Lab Overview', description: 'JSON, CSV, YAML, SQL, and structural data utilities.', icon: 'fa-database', tabId: 'data-lab', subtabId: 'overview', scope: 'Data Utility Lab', planned: ['JSON Validator', 'JSON Path Explorer', 'CSV Viewer', 'SQL Formatter', 'XML/YAML Viewer', 'Graph visualizer', 'Random data generator'] },
      { id: 'ai-lab-hub', title: 'AI Lab Overview', description: 'Client-side AI tooling stack and demos.', icon: 'fa-brain', tabId: 'ai-lab', subtabId: 'overview', scope: 'AI Lab', planned: ['Local summarizer', 'Sentiment analysis', 'Keyword extractor', 'Text classifier', 'Embedding generator', 'Image classifier', 'Prompt optimizer'] },
      { id: 'design-lab-hub', title: 'Color & Design Lab Overview', description: 'Color systems, glass effects, and CSS generators.', icon: 'fa-wand-magic-sparkles', tabId: 'design-lab', subtabId: 'overview', scope: 'Color & Design Lab', planned: ['Gradient generator', 'Glassmorphism generator', 'WCAG contrast checker', 'Theme generator', 'SVG pattern generator', 'Noise/grid generators'] },
      { id: 'media-lab-hub', title: 'Media Lab Overview', description: 'Client-side video/audio/image utilities.', icon: 'fa-photo-film', tabId: 'media-lab', subtabId: 'overview', scope: 'Media Lab', planned: ['Video to GIF', 'Trim/resize/compress video', 'Extract audio', 'Subtitle tools', 'Image optimizer', 'Audio trimmer'] },
      { id: 'advanced-security-hub', title: 'Advanced Security Lab Overview', description: 'Encryption, keys, certificates, and secure local flows.', icon: 'fa-user-secret', tabId: 'advanced-security', subtabId: 'overview', scope: 'Advanced Security Lab', planned: ['AES encrypt/decrypt', 'RSA key pair generator', 'Certificate parser', 'TOTP generator', 'Secure note encryptor', 'File checksum generator'] },
      { id: 'dev-lab-hub', title: 'Developer Lab Overview', description: 'Developer workflow accelerators and API tooling.', icon: 'fa-laptop-code', tabId: 'dev-lab', subtabId: 'overview', scope: 'Developer Lab', planned: ['HTTP request tester', 'Curl to fetch converter', 'OpenAPI viewer', 'Webhook tester', 'Cron parser/generator', 'Conventional commit builder'] },
      { id: 'web-lab-hub', title: 'Web Lab Overview', description: 'Web publishing and metadata generators.', icon: 'fa-globe', tabId: 'web-lab', subtabId: 'overview', scope: 'Web Lab', planned: ['Meta tag generator', 'OpenGraph preview', 'Sitemap generator', 'Favicon generator', 'PWA manifest generator', 'JSON to TypeScript types'] },
      { id: 'logic-lab-hub', title: 'Logic & Utility Lab Overview', description: 'Math, logic, and randomization tools.', icon: 'fa-circle-nodes', tabId: 'logic-lab', subtabId: 'overview', scope: 'Logic & Utility Lab', planned: ['Decision wheel', 'Truth table generator', 'Graph plotter', 'Function visualizer', 'Matrix calculator', 'Probability calculator'] }
    ]);

    loadPlannedLabs();
    const generatedPlanned = buildGeneratedPlannedMeta();
    if (generatedPlanned.length) {
      registerMeta(generatedPlanned);
      generatedPlanned.forEach((meta) => {
        if (!tools.has(meta.id)) registerTool({ id: meta.id, mount: mountGeneratedPlannedTool });
      });
    }

    registerTab({ id: 'writing', label: 'Text Studio', icon: 'fa-pen-nib', order: 1, description: 'Case tools, analysis, markdown, regex, and text workflows.', tools: ['markdown-previewer', 'text-diff-checker', 'word-frequency-analyzer', 'readability-score', 'case-converter', 'slug-generator', 'lorem-generator', 'regex-tester'], subtabs: [{ id: 'editor', label: 'Editor', icon: 'fa-markdown', tools: ['markdown-previewer', 'case-converter', 'slug-generator'] }, { id: 'analysis', label: 'Analysis', icon: 'fa-chart-line', tools: ['text-diff-checker', 'word-frequency-analyzer', 'readability-score', 'regex-tester'] }, { id: 'utility', label: 'Utility', icon: 'fa-wand-magic-sparkles', tools: ['lorem-generator'] }], load: loadWriting });
    registerTab({ id: 'data', label: 'Universal Converter', icon: 'fa-repeat', order: 2, description: 'Number, encoding, time, units, and structured format conversion.', tools: ['base-converter', 'url-encoder', 'base64-text', 'unix-timestamp-converter', 'unit-converter', 'csv-json-converter', 'color-converter'], subtabs: [{ id: 'number', label: 'Number', icon: 'fa-hashtag', tools: ['base-converter'] }, { id: 'encoding', label: 'Encoding', icon: 'fa-link', tools: ['url-encoder', 'base64-text', 'color-converter'] }, { id: 'time', label: 'Time & Units', icon: 'fa-clock', tools: ['unix-timestamp-converter', 'unit-converter'] }, { id: 'structured', label: 'Structured Data', icon: 'fa-table', tools: ['csv-json-converter'] }], load: loadData });
    registerTab({ id: 'security', label: 'Crypto & Security Lab', icon: 'fa-lock', order: 3, description: 'Hashing, HMAC, JWT, passwords, and secure identifiers.', tools: ['hash-compare', 'hmac-generator', 'jwt-encoder', 'password-generator', 'password-strength-checker', 'uuid-generator'], subtabs: [{ id: 'hash', label: 'Hashing', icon: 'fa-hashtag', tools: ['hash-compare'] }, { id: 'tokens', label: 'JWT/HMAC', icon: 'fa-key', tools: ['jwt-encoder', 'hmac-generator'] }, { id: 'passwords', label: 'Passwords', icon: 'fa-user-shield', tools: ['password-generator', 'password-strength-checker'] }, { id: 'keys', label: 'Keys/IDs', icon: 'fa-fingerprint', tools: ['uuid-generator'] }], load: loadSecurity });
    registerTab({ id: 'data-lab', label: 'Data Utility Lab', icon: 'fa-database', order: 4, description: 'Data validation, formatting, and inspection workflows.', tools: ['json-formatter', 'url-parser', 'data-lab-hub'], subtabs: [{ id: 'json', label: 'JSON', icon: 'fa-code', tools: ['json-formatter'] }, { id: 'inspect', label: 'Inspect', icon: 'fa-magnifying-glass', tools: ['url-parser'] }, { id: 'overview', label: 'Roadmap', icon: 'fa-list-check', tools: ['data-lab-hub'] }], load: loadData });
    registerTab({ id: 'productivity', label: 'Productivity Lab', icon: 'fa-bolt', order: 5, description: 'Planning, focus, and calculators.', tools: ['pomodoro-timer', 'timezone-converter', 'random-picker', 'percentage-calculator', 'loan-calculator'], subtabs: [{ id: 'focus', label: 'Focus', icon: 'fa-stopwatch', tools: ['pomodoro-timer'] }, { id: 'planning', label: 'Planning', icon: 'fa-calendar-check', tools: ['timezone-converter', 'random-picker', 'percentage-calculator', 'loan-calculator'] }], load: loadProductivity });
    registerTab({ id: 'ai-lab', label: 'AI Lab', icon: 'fa-brain', order: 6, description: 'Client-side AI tooling with TF.js, ONNX, Transformers, and WebLLM.', tools: ['ai-lab-hub'] });
    registerTab({ id: 'design-lab', label: 'Color & Design Lab', icon: 'fa-wand-magic-sparkles', order: 7, description: 'Color systems, gradients, glass effects, and design utilities.', tools: ['design-lab-hub'] });
    registerTab({ id: 'media-lab', label: 'Media Lab', icon: 'fa-photo-film', order: 8, description: 'Client-side video/audio/image utilities.', tools: ['media-lab-hub'] });
    registerTab({ id: 'advanced-security', label: 'Advanced Security Lab', icon: 'fa-user-secret', order: 9, description: 'Encryption workflows and secure local tooling.', tools: ['advanced-security-hub'] });
    registerTab({ id: 'dev-lab', label: 'Developer Lab', icon: 'fa-laptop-code', order: 10, description: 'Developer power tooling and API helpers.', tools: ['dev-lab-hub'] });
    registerTab({ id: 'web-lab', label: 'Web Lab', icon: 'fa-globe', order: 11, description: 'Web metadata, manifests, and export tooling.', tools: ['web-lab-hub'] });
    registerTab({ id: 'logic-lab', label: 'Logic & Utility Lab', icon: 'fa-circle-nodes', order: 12, description: 'Math, logic, and randomization utilities.', tools: ['logic-lab-hub'] });
    appendGeneratedToolsToTabs(generatedPlanned);
  }

  function setupHeader() {
    const applySearch = debounce(() => {
      state.search = state.searchEl.value || '';
      renderWorkspace();
    }, DEBOUNCE_MS);
    state.searchEl.addEventListener('input', applySearch);
    if (state.searchClear) {
      state.searchClear.addEventListener('click', () => {
        state.searchEl.value = '';
        state.search = '';
        state.searchClear.hidden = true;
        renderWorkspace();
        state.searchEl.focus();
      });
      state.searchEl.addEventListener('input', () => {
        state.searchClear.hidden = !state.searchEl.value;
      });
    }
    state.favoritesBtn.addEventListener('click', () => {
      state.favoritesOnly = !state.favoritesOnly;
      state.favoritesBtn.classList.toggle('active', state.favoritesOnly);
      state.favoritesBtn.setAttribute('aria-pressed', state.favoritesOnly ? 'true' : 'false');
      renderWorkspace();
    });
    if (state.commandBtn) state.commandBtn.addEventListener('click', () => openPalette(''));
  }

  async function setupDashboard() {
    state.root = document.getElementById('tools-dashboard');
    if (!state.root) return;
    state.root.innerHTML = `
      <div class="tools-placeholder">
        <h2>Utility workspace is being rebuilt.</h2>
        <p>Check back soon for the new experience.</p>
      </div>
    `;
    state.root.style.display = 'block';
  }

  window.toolsDashboard = {
    registerTool,
    registerTab,
    activateTab,
    activateSubtab,
    openTool,
    refresh: setupDashboard,
    listTools: () => Array.from(toolMeta.keys()),
    listTabs: () => orderedTabs().map((tab) => tab.id),
    listToolMeta: () => allToolMeta().map((meta) => {
      const tab = tabs.get(meta.tabId);
      return {
        id: meta.id,
        title: meta.title,
        description: meta.description,
        icon: meta.icon,
        tabId: meta.tabId,
        tabLabel: tab ? tab.label : ''
      };
    }),
    getToolMeta: (toolId) => {
      const meta = toolMeta.get(toolId);
      return meta ? { ...meta } : null;
    },
    getFavorites: () => Array.from(state.favorites),
    openPalette
  };
  window.setupToolsDashboard = setupDashboard;

  if (document.readyState !== 'loading') setupDashboard();
  else document.addEventListener('DOMContentLoaded', setupDashboard, { once: true });
})();
