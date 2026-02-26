// blog-loader.js - Blog Loader & Logic
// NO MODULE EXPORTS - Using global scope for compatibility
// Requires: utils.js, markdown-parser.js to be loaded first

const POST_MANIFEST = [
  'Markdowntest.md',
  'NomuSite.md',
  'MAIV1.md',
  'SUpdate1.md',
  'Pornban.md',
  'SUpdate2.md',
  'SUpdate3.md',
  'PlanChina.md'
];

const RESOURCE_MANIFEST = [
  'StarterTutorial.md',
  'ToolingWorkflow.md'
];

const PROJECT_MANIFEST = [
  'mai-engine.md',
  'nomu-site.md',
  'micro-code-2.0.md',
];

let allPosts = [];
let filteredPosts = [];
let allResources = [];
let allProjects = [];
let currentCategory = 'all';
let currentSearchQuery = '';
let currentSort = 'newest';
let currentPage = 1;
let currentHubView = 'home';
let currentResourceTypeFilter = 'all';
let currentResourceSearch = '';
let currentResourceSort = 'newest';
let currentResourcePage = 1;
let currentProjectSearch = '';
let currentProjectSort = 'featured';
let currentProjectFilter = 'all';
let currentProjectPage = 1;
let searchHistory = [];
let blogControlsInitialized = false;
let hubActionsInitialized = false;
let suppressPostsListScroll = false;
let leftRailEventsBound = false;
let leftRailContext = 'home';
const postsPerPage = 6;
const projectsPerPage = 6;
const resourcesPerPage = 6;
const LEFT_RAIL_BREAKPOINT = 1024;
const homePreviewLimits = {
  projects: 2,
  resources: 2,
  posts: 2,
  tools: 4
};

const POST_CATEGORY_ICONS = {
  all: 'fas fa-layer-group',
  Development: 'fas fa-code',
  Life: 'fas fa-leaf',
  Projects: 'fas fa-diagram-project',
  Politics: 'fas fa-landmark'
};

const RESOURCE_TYPE_ICONS = {
  all: 'fas fa-layer-group',
  Tutorial: 'fas fa-graduation-cap',
  Guide: 'fas fa-compass',
  Reference: 'fas fa-book-open',
  Docs: 'fas fa-file-lines'
};

const PROJECT_TYPE_ICONS = {
  all: 'fas fa-layer-group',
  Coding: 'fas fa-code',
  Website: 'fas fa-globe',
  Research: 'fas fa-flask',
  'Video Editing': 'fas fa-film'
};

const EXTERNAL_RESOURCES = [];

const TOOLS_PREVIEW = [];

const GAMES_LIST = [
  {
    id: 'imposter-game',
    title: 'Imposter Game',
    description: 'Social deduction round where one player is the imposter and everyone else shares the same secret role.',
    icon: 'fa-user-secret',
    chips: ['Social', 'Party']
  },
  {
    id: 'fishbowl-characters',
    title: 'Fishbowl Characters',
    description: 'Character fishbowl in 3 rounds: full description, miming, and 1 word only.',
    icon: 'fa-fish',
    chips: ['3 rounds', 'Characters']
  }
];

// Load search history from localStorage
function loadSearchHistory() {
  const saved = localStorage.getItem('searchHistory');
  searchHistory = saved ? JSON.parse(saved) : [];
}

// Save search history to localStorage
function saveSearchHistory() {
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.slice(0, 10)));
}

// Helpers - excerpt generator
function generateExcerpt(markdown, wordLimit = 30) {
  let text = markdown.replace(/```[\s\S]*?```/g, ' ')
                     .replace(/`([^`]*)`/g, '$1')
                     .replace(/!\[.*?\]\(.*?\)/g, '')
                     .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                     .replace(/<\/?[^>]+(>|$)/g, ' ')
                     .replace(/[#>*_~\-`]/g, ' ')
                     .replace(/\s+/g, ' ')
                     .trim();
  const words = text.split(' ');
  if (words.length <= wordLimit) return text;
  return words.slice(0, wordLimit).join(' ') + '...';
}

function clampWords(text = '', limit = 28) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length <= limit) return words.join(' ');
  return `${words.slice(0, limit).join(' ')}…`;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parsePipeList(value = '') {
  return String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseInlineList(value = '') {
  return String(value || '')
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonArray(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function parseDownloads(value = '') {
  return parsePipeList(value)
    .map((item) => {
      const [labelRaw, urlRaw] = item.includes('::') ? item.split('::') : ['', item];
      const url = String(urlRaw || '').trim();
      if (!url) return null;
      const label = String(labelRaw || '').trim();
      return {
        label: label || url.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
        url
      };
    })
    .filter(Boolean);
}

function parseSteps(frontmatter = {}, body = '') {
  const fromFrontmatter = parsePipeList(frontmatter.steps || '');
  if (fromFrontmatter.length) return fromFrontmatter;

  const bodyMatches = String(body || '')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*\d+\.\s+(.+)$/))
    .filter(Boolean)
    .map((match) => match[1].trim())
    .filter(Boolean);

  return bodyMatches.slice(0, 8);
}

function formatCompactDate(dateString = '') {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildMetaMarkup(parts = []) {
  const safeParts = parts.filter(Boolean).map((part) => escapeHtml(part));
  if (!safeParts.length) return '';
  return safeParts
    .map((part) => `<span>${part}</span>`)
    .join('<span class="meta-sep">&bull;</span>');
}

function getPostCategoryIcon(category = 'all') {
  return POST_CATEGORY_ICONS[category] || 'fas fa-tag';
}

function getResourceTypeIcon(type = 'all') {
  return RESOURCE_TYPE_ICONS[type] || 'fas fa-book-open';
}

function getProjectTypeIcon(type = 'all') {
  return PROJECT_TYPE_ICONS[type] || 'fas fa-diagram-project';
}

function getFavoritePostSlugs() {
  try {
    const parsed = JSON.parse(localStorage.getItem('post-favorites-v1') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createMediaBackdropCard(options = {}) {
  const {
    tag = 'button',
    href = '',
    typeClass = '',
    size = 'md',
    layout = 'bottomText',
    title = '',
    description = '',
    cover = '',
    chips = [],
    meta = [],
    iconHtml = '',
    actionHtml = '',
    showExcerpt = true,
    showMeta = true,
    ctaText = '',
    dataAttrs = ''
  } = options;

  const chipsMarkup = chips.length
    ? `<div class="media-card-chips">${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')}</div>`
    : '';
  const topMarkup = iconHtml || actionHtml
    ? `
      <div class="media-card-top">
        ${iconHtml ? `<span class="media-card-icon">${iconHtml}</span>` : '<span></span>'}
        ${actionHtml ? `<span class="media-card-action">${actionHtml}</span>` : ''}
      </div>
    `
    : '';
  const metaMarkup = showMeta ? buildMetaMarkup(meta) : '';
  const descriptionMarkup = showExcerpt && description ? `<p class="media-card-desc">${escapeHtml(description)}</p>` : '';
  const ctaMarkup = ctaText ? `<span class="media-card-cta" aria-hidden="true">${escapeHtml(ctaText)}</span>` : '';
  const mediaMarkup = cover
    ? `
      <div class="card-media-wrap media-card-media">
        <img class="media-card-image" src="${cover}" alt="${escapeHtml(title)}" loading="lazy" decoding="async">
        <div class="media-card-overlay"></div>
      </div>
    `
    : `
      <div class="card-media-wrap media-card-media no-media">
        <div class="media-card-fallback" aria-hidden="true">
          ${iconHtml ? iconHtml : '<i class="fas fa-layer-group"></i>'}
          <span>Preview</span>
        </div>
      </div>
    `;

  const classes = `media-card ${typeClass} glass-card glass-card--media media-card--${size} ${layout === 'centerText' ? 'media-card--center' : ''}`.trim();
  const attrs = [dataAttrs, href && tag === 'a' ? `href="${href}" target="_blank" rel="noopener noreferrer"` : '', tag === 'button' ? 'type="button"' : '']
    .filter(Boolean)
    .join(' ');

  return `
    <${tag} class="${classes}" ${attrs}>
      ${mediaMarkup}
      <div class="media-card-content">
        ${topMarkup}
        ${chipsMarkup}
        <h4 class="media-card-title">${escapeHtml(title)}</h4>
        ${descriptionMarkup}
        ${metaMarkup ? `<p class="media-card-meta">${metaMarkup}</p>` : ''}
        ${ctaMarkup}
      </div>
    </${tag}>
  `;
}

function isSingleContentView() {
  const singleView = document.getElementById('single-post-view');
  return Boolean(singleView && singleView.style.display !== 'none');
}

function getActiveRailElement() {
  return isSingleContentView()
    ? document.getElementById('toc-sidebar')
    : document.getElementById('left-rail');
}

function setRailMode(mode = 'hub') {
  const leftRail = document.getElementById('left-rail');
  const tocRail = document.getElementById('toc-sidebar');
  const isSingle = mode === 'single';
  const isHidden = mode === 'hidden';
  if (leftRail) leftRail.hidden = isSingle || isHidden;
  if (tocRail) tocRail.hidden = !isSingle || isHidden;
  if (!isSingle) {
    document.body.classList.remove('single-rail-mode');
  } else {
    document.body.classList.add('single-rail-mode');
  }
}

function setRailDrawerOpen(open) {
  const rail = getActiveRailElement();
  const toggle = document.getElementById('left-rail-toggle');
  const backdrop = document.getElementById('left-rail-backdrop');
  if (!rail || !toggle || !backdrop) return;

  const shouldOpen = Boolean(open);
  document.body.classList.toggle('left-rail-open', shouldOpen);
  toggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  backdrop.hidden = !shouldOpen;
  rail.classList.toggle('open', shouldOpen);
}

function closeRailDrawer() {
  setRailDrawerOpen(false);
}

function railItemMarkup(item = {}) {
  const icon = item.icon ? `<i class="${item.icon}" aria-hidden="true"></i>` : '';
  const meta = item.meta ? `<span class="left-rail-item-meta">${escapeHtml(item.meta)}</span>` : '';
  const activeClass = item.active ? ' is-active' : '';
  const attrs = [
    item.action ? `data-rail-action="${escapeHtml(item.action)}"` : '',
    item.value ? `data-rail-value="${escapeHtml(item.value)}"` : '',
    item.slug ? `data-rail-slug="${escapeHtml(item.slug)}"` : '',
    item.projectId ? `data-rail-project="${escapeHtml(item.projectId)}"` : '',
    item.toolId ? `data-rail-tool="${escapeHtml(item.toolId)}"` : '',
    item.tabId ? `data-rail-tab="${escapeHtml(item.tabId)}"` : '',
    item.targetId ? `data-rail-target="${escapeHtml(item.targetId)}"` : ''
  ].filter(Boolean).join(' ');

  if (item.href) {
    return `
      <li>
        <a class="left-rail-item list-item${activeClass}" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">
          ${icon}
          <span>${escapeHtml(item.label || '')}</span>
          ${meta}
        </a>
      </li>
    `;
  }

  if (!item.action) {
    return `
      <li>
        <div class="left-rail-item list-item is-static${activeClass}">
          ${icon}
          <span>${escapeHtml(item.label || '')}</span>
          ${meta}
        </div>
      </li>
    `;
  }

  return `
    <li>
      <button class="left-rail-item list-item${activeClass}" type="button" ${attrs}>
        ${icon}
        <span>${escapeHtml(item.label || '')}</span>
        ${meta}
      </button>
    </li>
  `;
}

function railGroupMarkup(title, items = []) {
  const body = items.length
    ? `<ul class="left-rail-list" role="list">${items.map((item) => railItemMarkup(item)).join('')}</ul>`
    : '<p class="left-rail-empty">No items yet.</p>';
  return `
    <section class="left-rail-group">
      <h3>${escapeHtml(title)}</h3>
      ${body}
    </section>
  `;
}

function railPillGroupMarkup(title, items = []) {
  const body = items.length
    ? `
      <div class="left-rail-pill-row" role="group" aria-label="${escapeHtml(title)} filters">
        ${items.map((item) => {
          const icon = item.icon ? `<i class="${item.icon}" aria-hidden="true"></i>` : '';
          const activeClass = item.active ? ' is-active' : '';
          const attrs = [
            item.action ? `data-rail-action="${escapeHtml(item.action)}"` : '',
            item.value ? `data-rail-value="${escapeHtml(item.value)}"` : ''
          ].filter(Boolean).join(' ');
          return `<button class="left-rail-pill chip${activeClass}" type="button" ${attrs}>${icon}<span>${escapeHtml(item.label || '')}</span></button>`;
        }).join('')}
      </div>
    `
    : '<p class="left-rail-empty">No filters available.</p>';
  return `
    <section class="left-rail-group">
      <h3>${escapeHtml(title)}</h3>
      ${body}
    </section>
  `;
}

function buildHomeRailMarkup() {
  const latestPost = sortPosts(allPosts, 'newest')[0];
  const quickJump = [
    { label: 'Projects', icon: 'fas fa-diagram-project', action: 'hub-view', value: 'projects' },
    { label: 'Resources', icon: 'fas fa-book-bookmark', action: 'hub-view', value: 'resources' },
    { label: 'Games', icon: 'fas fa-gamepad', action: 'hub-view', value: 'games' },
    { label: 'Latest Posts', icon: 'fas fa-newspaper', action: 'hub-view', value: 'posts' },
    { label: 'Tools Workspace', icon: 'fas fa-screwdriver-wrench', action: 'open-tools' }
  ];
  const status = [
    { label: `${allProjects.length} tracked projects`, icon: 'fas fa-layer-group' },
    { label: `${allResources.length} resources in hub`, icon: 'fas fa-book-open' },
    latestPost
      ? { label: 'Latest post', icon: 'fas fa-clock', meta: `${formatCompactDate(latestPost.date)} - ${latestPost.title}` }
      : { label: 'No posts published yet', icon: 'fas fa-clock' }
  ];
  return `${railGroupMarkup('Quick Jump', quickJump)}${railGroupMarkup('Now / Status', status)}`;
}

function buildProjectsRailMarkup() {
  const typeCount = new Map();
  allProjects.forEach((project) => {
    const key = project.type || 'General';
    typeCount.set(key, (typeCount.get(key) || 0) + 1);
  });

  const categories = Array.from(typeCount.entries()).map(([type, count]) => ({
    label: type,
    icon: getProjectTypeIcon(type),
    action: 'project-filter',
    value: type,
    active: currentProjectFilter === type,
    meta: `${count} project${count === 1 ? '' : 's'}`
  }));
  categories.unshift({
    label: 'All Projects',
    icon: getProjectTypeIcon('all'),
    action: 'project-filter',
    value: 'all',
    active: currentProjectFilter === 'all'
  });

  const inProgress = allProjects
    .filter((project) => /progress|wip|active/i.test(String(project.status || '')))
    .slice(0, 4)
    .map((project) => ({
      label: project.title,
      icon: getProjectTypeIcon(project.type),
      action: 'open-project',
      projectId: project.id,
      meta: project.status || ''
    }));

  return `${railPillGroupMarkup('Filters', categories)}${railGroupMarkup('In Progress', inProgress)}`;
}

function buildResourcesRailMarkup() {
  const types = ['all', ...new Set(allResources.map((item) => String(item.type || '').trim()).filter(Boolean))];
  const typeFilters = types.map((type) => ({
    label: type === 'all' ? 'All Types' : type,
    icon: getResourceTypeIcon(type),
    action: 'resource-filter',
    value: type,
    active: currentResourceTypeFilter === type
  }));

  const recommended = allResources
    .slice()
    .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
    .slice(0, 4)
    .map((resource) => {
      if (resource.external) {
        return {
          label: resource.title,
          icon: getResourceTypeIcon(resource.type),
          href: resource.url,
          meta: 'External'
        };
      }
      return {
        label: resource.title,
        icon: getResourceTypeIcon(resource.type),
        action: 'open-resource',
        slug: resource.slug
      };
    });

  return `${railPillGroupMarkup('Filters', typeFilters)}${railGroupMarkup('Recommended', recommended)}`;
}

function buildGamesRailMarkup() {
  const items = GAMES_LIST.map((game) => ({
    label: game.title,
    icon: `fas ${game.icon || 'fa-gamepad'}`,
    meta: (game.chips || []).join(' • ')
  }));
  return railGroupMarkup('Games', items);
}

function buildPostsRailMarkup() {
  const categories = ['all', 'Development', 'Life', 'Projects', 'Politics']
    .map((category) => ({
      label: category === 'all' ? 'All Posts' : category,
      icon: getPostCategoryIcon(category),
      action: 'post-category',
      value: category,
      active: currentCategory === category
    }));

  const favoriteSlugs = getFavoritePostSlugs();
  const favoritePosts = favoriteSlugs
    .map((slug) => allPosts.find((post) => post.slug === slug))
    .filter(Boolean)
    .slice(0, 3);
  const recommendedPosts = sortPosts(allPosts, 'newest')
    .filter((post) => !favoritePosts.some((item) => item.slug === post.slug))
    .slice(0, 3);
  const recommendedOrFavorites = [...favoritePosts, ...recommendedPosts]
    .slice(0, 5)
    .map((post) => ({
      label: post.title,
      icon: getPostCategoryIcon(post.category),
      action: 'open-post',
      slug: post.slug,
      meta: favoriteSlugs.includes(post.slug) ? 'Favorite' : 'Recommended'
    }));

  return `${railPillGroupMarkup('Filters', categories)}${railGroupMarkup('Recommended / Favorites', recommendedOrFavorites)}`;
}

function buildToolsRailMarkup() {
  const tabs = [
    { id: 'writing', label: 'Text Studio', icon: 'fas fa-pen-nib' },
    { id: 'data', label: 'Universal Converter', icon: 'fas fa-repeat' },
    { id: 'security', label: 'Crypto & Security Lab', icon: 'fas fa-lock' },
    { id: 'data-lab', label: 'Data Utility Lab', icon: 'fas fa-database' },
    { id: 'productivity', label: 'Productivity Lab', icon: 'fas fa-bolt' }
  ];

  const tabItems = tabs.map((tab) => ({
    label: tab.label,
    icon: tab.icon,
    action: 'tool-tab',
    tabId: tab.id
  }));

  const favorites = [];
  const dashboard = window.toolsDashboard;
  let favoriteIds = [];
  if (dashboard && typeof dashboard.getFavorites === 'function') {
    favoriteIds = dashboard.getFavorites();
  } else {
    try {
      const parsed = JSON.parse(localStorage.getItem('tools-favorites-v3') || '[]');
      favoriteIds = Array.isArray(parsed) ? parsed : [];
    } catch {
      favoriteIds = [];
    }
  }
  const metaList = dashboard && typeof dashboard.listToolMeta === 'function'
    ? dashboard.listToolMeta()
    : [];
  const metaById = new Map(metaList.map((meta) => [meta.id, meta]));
  favoriteIds.slice(0, 5).forEach((toolId) => {
    const meta = metaById.get(toolId);
    favorites.push({
      label: meta ? meta.title : toolId,
      icon: 'fas fa-star',
      action: 'tool-open',
      toolId
    });
  });

  const shortcuts = [
    { label: 'Open command palette', icon: 'fas fa-keyboard', meta: 'Ctrl/Cmd + K' },
    { label: 'Navigate tool list', icon: 'fas fa-arrow-up', meta: 'Arrow keys + Enter' },
    { label: 'Toggle favorites', icon: 'fas fa-star', meta: 'Use star icon in header' }
  ];

  return `${railGroupMarkup('Tool Categories', tabItems)}${railGroupMarkup('Favorites', favorites)}${railGroupMarkup('Shortcuts', shortcuts)}`;
}

function renderLeftRailContent(context = 'home') {
  const railContent = document.getElementById('left-rail-content');
  const railTitle = document.querySelector('#left-rail .left-rail-title');
  if (!railContent || !railTitle) return;

  let title = 'Quick Jump';
  let content = '';

  if (context === 'projects') {
    title = 'Projects';
    content = buildProjectsRailMarkup();
  } else if (context === 'resources') {
    title = 'Resources';
    content = buildResourcesRailMarkup();
  } else if (context === 'games') {
    title = 'Games';
    content = buildGamesRailMarkup();
  } else if (context === 'posts') {
    title = 'Blog';
    content = buildPostsRailMarkup();
  } else if (context === 'tools') {
    title = 'Utility Workspace';
    content = buildToolsRailMarkup();
  } else {
    title = '';
    content = buildHomeRailMarkup();
  }

  railTitle.textContent = title;
  railContent.innerHTML = content;
}

function handleLeftRailAction(actionEl) {
  const action = actionEl.getAttribute('data-rail-action');
  if (!action) return;

  if (action === 'hub-view') {
    const view = actionEl.getAttribute('data-rail-value') || 'home';
    setContentHubView(view, { replaceState: false, scrollToSection: true });
  } else if (action === 'open-tools') {
    if (typeof window.showToolsDashboardView === 'function') {
      window.showToolsDashboardView();
    }
  } else if (action === 'resource-filter') {
    currentResourceTypeFilter = actionEl.getAttribute('data-rail-value') || 'all';
    currentResourcePage = 1;
    setupResourcesShowcase({ preview: false });
    setLeftRailContext('resources');
  } else if (action === 'project-filter') {
    currentProjectFilter = actionEl.getAttribute('data-rail-value') || 'all';
    currentProjectPage = 1;
    setupProjectsShowcase({ preview: false });
    setLeftRailContext('projects');
  } else if (action === 'post-category') {
    const category = actionEl.getAttribute('data-rail-value') || 'all';
    setContentHubView('posts', { replaceState: false, scrollToSection: true });
    applyCategoryFilter(category, {
      clearSearch: false,
      suppressAutoScroll: true,
      resetPage: true,
      replaceState: false
    });
  } else if (action === 'open-post') {
    const slug = actionEl.getAttribute('data-rail-slug');
    if (slug) showSinglePost(slug);
  } else if (action === 'open-project') {
    const projectId = actionEl.getAttribute('data-rail-project');
    if (projectId) showProjectShowcase(projectId);
  } else if (action === 'open-resource') {
    const slug = actionEl.getAttribute('data-rail-slug');
    if (slug) showResourcePage(slug);
  } else if (action === 'tool-tab') {
    const tabId = actionEl.getAttribute('data-rail-tab');
    if (typeof window.showToolsDashboardView === 'function') {
      window.showToolsDashboardView({ pushState: false });
    }
    if (tabId && window.toolsDashboard && typeof window.toolsDashboard.activateTab === 'function') {
      window.toolsDashboard.activateTab(tabId);
    }
  } else if (action === 'tool-open') {
    const toolId = actionEl.getAttribute('data-rail-tool');
    if (toolId && window.toolsDashboard && typeof window.toolsDashboard.openTool === 'function') {
      window.toolsDashboard.openTool(toolId);
    }
  }

  if (window.innerWidth <= LEFT_RAIL_BREAKPOINT) {
    closeRailDrawer();
  }
}

function ensureLeftRailEvents() {
  if (leftRailEventsBound) return;
  leftRailEventsBound = true;

  const toggle = document.getElementById('left-rail-toggle');
  const backdrop = document.getElementById('left-rail-backdrop');
  const leftRail = document.getElementById('left-rail');
  const tocRail = document.getElementById('toc-sidebar');

  if (toggle) {
    toggle.addEventListener('click', () => {
      const isOpen = document.body.classList.contains('left-rail-open');
      setRailDrawerOpen(!isOpen);
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', () => closeRailDrawer());
  }

  document.querySelectorAll('[data-left-rail-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeRailDrawer());
  });

  if (leftRail) {
    leftRail.addEventListener('click', (event) => {
      const actionEl = event.target.closest('[data-rail-action]');
      if (!actionEl) return;
      handleLeftRailAction(actionEl);
    });

    leftRail.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
      if (target.matches('[data-rail-search="posts"]')) {
        currentSearchQuery = target.value.trim();
        filterPosts({ resetPage: true, replaceState: true });
      } else if (target.matches('[data-rail-search="resources"]')) {
        currentResourceSearch = target.value.trim();
        currentResourcePage = 1;
        setupResourcesShowcase({ preview: false });
      } else if (target.matches('[data-rail-search="projects"]')) {
        currentProjectSearch = target.value.trim();
        currentProjectPage = 1;
        setupProjectsShowcase({ preview: false });
      }
    });

    leftRail.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
      if (target.matches('[data-rail-sort="posts"]')) {
        currentSort = normalizeSort(target.value);
        filterPosts({ resetPage: true, replaceState: false });
      } else if (target.matches('[data-rail-sort="resources"]')) {
        currentResourceSort = normalizeResourceSort(target.value);
        currentResourcePage = 1;
        setupResourcesShowcase({ preview: false });
      } else if (target.matches('[data-rail-sort="projects"]')) {
        currentProjectSort = normalizeProjectSort(target.value);
        currentProjectPage = 1;
        setupProjectsShowcase({ preview: false });
      }
    });
  }

  if (tocRail) {
    tocRail.addEventListener('click', (event) => {
      const closeBtn = event.target.closest('[data-left-rail-close]');
      if (closeBtn) {
        closeRailDrawer();
      }
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > LEFT_RAIL_BREAKPOINT) {
      closeRailDrawer();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('left-rail-open')) {
      closeRailDrawer();
    }
  });

  window.addEventListener('tools-favorites-changed', () => {
    if (leftRailContext === 'tools') {
      renderLeftRailContent('tools');
    }
  });
}

function setLeftRailContext(context = 'home') {
  leftRailContext = context;
  ensureLeftRailEvents();

  if (context === 'hidden') {
    const leftRail = document.getElementById('left-rail');
    if (leftRail) {
      leftRail.hidden = true;
    }
    closeRailDrawer();
    return;
  }

  if (isSingleContentView()) {
    setRailMode('single');
    return;
  }

  setRailMode('hub');
  renderLeftRailContent(context);
}

const projectAlbumLightboxState = {
  mounted: false,
  items: [],
  index: 0,
  root: null,
  stage: null,
  image: null,
  caption: null,
  counter: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  isDragging: false
};

function closeProjectAlbumLightbox() {
  const { root } = projectAlbumLightboxState;
  if (!root) return;
  root.classList.remove('open');
  root.setAttribute('aria-hidden', 'true');
  window.setTimeout(() => {
    root.hidden = true;
  }, 160);
}

function applyProjectAlbumTransform() {
  const { image, zoom, panX, panY } = projectAlbumLightboxState;
  if (!image) return;
  image.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
}

function resetProjectAlbumTransform() {
  projectAlbumLightboxState.zoom = 1;
  projectAlbumLightboxState.panX = 0;
  projectAlbumLightboxState.panY = 0;
  applyProjectAlbumTransform();
}

function renderProjectAlbumLightbox() {
  const { items, index, image, caption, counter, root } = projectAlbumLightboxState;
  if (!items.length || !image || !caption || !counter) return;
  const current = items[index] || items[0];
  if (!current) return;
  image.src = current.src;
  image.alt = current.alt || current.caption || `Album image ${index + 1}`;
  image.setAttribute('draggable', 'false');
  caption.textContent = current.caption || current.alt || '';
  counter.textContent = `${index + 1} / ${items.length}`;
  if (root) {
    root.classList.toggle('single', items.length <= 1);
  }
  resetProjectAlbumTransform();
}

function ensureProjectAlbumLightbox() {
  if (projectAlbumLightboxState.mounted && projectAlbumLightboxState.root) {
    return projectAlbumLightboxState.root;
  }

  const root = document.createElement('div');
  root.id = 'project-album-lightbox';
  root.className = 'project-album-lightbox';
  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="project-album-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Project album viewer">
      <button class="project-album-close" type="button" data-album-close aria-label="Close album">
        <i class="fas fa-xmark" aria-hidden="true"></i>
      </button>
      <button class="project-album-nav prev" type="button" data-album-prev aria-label="Previous image">
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
      </button>
      <div class="project-album-stage" data-album-stage>
        <img class="project-album-image" data-album-image src="" alt="">
      </div>
      <button class="project-album-nav next" type="button" data-album-next aria-label="Next image">
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
      </button>
      <div class="project-album-foot">
        <div class="project-album-meta">
          <span class="project-album-count" data-album-count>1 / 1</span>
          <div class="project-album-zoom-controls" aria-label="Zoom controls">
            <button class="project-album-zoom-btn" type="button" data-album-zoom-out aria-label="Zoom out">
              <i class="fas fa-minus" aria-hidden="true"></i>
            </button>
            <button class="project-album-zoom-btn" type="button" data-album-zoom-reset aria-label="Reset zoom">
              <i class="fas fa-arrows-rotate" aria-hidden="true"></i>
            </button>
            <button class="project-album-zoom-btn" type="button" data-album-zoom-in aria-label="Zoom in">
              <i class="fas fa-plus" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <p class="project-album-caption" data-album-caption></p>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const prev = root.querySelector('[data-album-prev]');
  const next = root.querySelector('[data-album-next]');
  const stage = root.querySelector('[data-album-stage]');
  const zoomIn = root.querySelector('[data-album-zoom-in]');
  const zoomOut = root.querySelector('[data-album-zoom-out]');
  const zoomReset = root.querySelector('[data-album-zoom-reset]');

  prev.addEventListener('click', () => {
    const total = projectAlbumLightboxState.items.length;
    if (!total) return;
    projectAlbumLightboxState.index = (projectAlbumLightboxState.index - 1 + total) % total;
    renderProjectAlbumLightbox();
  });
  next.addEventListener('click', () => {
    const total = projectAlbumLightboxState.items.length;
    if (!total) return;
    projectAlbumLightboxState.index = (projectAlbumLightboxState.index + 1) % total;
    renderProjectAlbumLightbox();
  });

  root.addEventListener('click', (event) => {
    if (event.target === root || event.target.closest('[data-album-close]')) {
      closeProjectAlbumLightbox();
    }
  });

  const clampZoom = (value) => Math.max(1, Math.min(4, value));
  if (stage) {
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;

    stage.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      projectAlbumLightboxState.isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      originX = projectAlbumLightboxState.panX;
      originY = projectAlbumLightboxState.panY;
      stage.classList.add('is-dragging');
      stage.setPointerCapture(event.pointerId);
    });

    stage.addEventListener('pointermove', (event) => {
      if (!projectAlbumLightboxState.isDragging) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      projectAlbumLightboxState.panX = originX + dx;
      projectAlbumLightboxState.panY = originY + dy;
      applyProjectAlbumTransform();
    });

    stage.addEventListener('pointerup', () => {
      projectAlbumLightboxState.isDragging = false;
      stage.classList.remove('is-dragging');
    });

    stage.addEventListener('pointercancel', () => {
      projectAlbumLightboxState.isDragging = false;
      stage.classList.remove('is-dragging');
    });

    stage.addEventListener('wheel', (event) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.15 : -0.15;
      projectAlbumLightboxState.zoom = clampZoom(projectAlbumLightboxState.zoom + delta);
      applyProjectAlbumTransform();
    }, { passive: false });

    stage.addEventListener('dblclick', () => {
      projectAlbumLightboxState.zoom = projectAlbumLightboxState.zoom > 1 ? 1 : 2;
      if (projectAlbumLightboxState.zoom === 1) {
        projectAlbumLightboxState.panX = 0;
        projectAlbumLightboxState.panY = 0;
      }
      applyProjectAlbumTransform();
    });
  }

  if (zoomIn) {
    zoomIn.addEventListener('click', () => {
      projectAlbumLightboxState.zoom = clampZoom(projectAlbumLightboxState.zoom + 0.2);
      applyProjectAlbumTransform();
    });
  }
  if (zoomOut) {
    zoomOut.addEventListener('click', () => {
      projectAlbumLightboxState.zoom = clampZoom(projectAlbumLightboxState.zoom - 0.2);
      applyProjectAlbumTransform();
    });
  }
  if (zoomReset) {
    zoomReset.addEventListener('click', () => {
      resetProjectAlbumTransform();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (!projectAlbumLightboxState.root || projectAlbumLightboxState.root.hidden) return;
    if (event.key === 'Escape') {
      closeProjectAlbumLightbox();
      return;
    }
    if (event.key === 'ArrowLeft') prev.click();
    if (event.key === 'ArrowRight') next.click();
  });

  projectAlbumLightboxState.mounted = true;
  projectAlbumLightboxState.root = root;
  projectAlbumLightboxState.stage = stage;
  projectAlbumLightboxState.image = root.querySelector('[data-album-image]');
  projectAlbumLightboxState.caption = root.querySelector('[data-album-caption]');
  projectAlbumLightboxState.counter = root.querySelector('[data-album-count]');

  return root;
}

function openProjectAlbumLightbox(items = [], index = 0) {
  if (!Array.isArray(items) || !items.length) return;
  const root = ensureProjectAlbumLightbox();
  projectAlbumLightboxState.items = items.filter((item) => item && item.src);
  if (!projectAlbumLightboxState.items.length) return;
  projectAlbumLightboxState.index = Math.min(
    Math.max(0, Number.parseInt(index, 10) || 0),
    projectAlbumLightboxState.items.length - 1
  );
  renderProjectAlbumLightbox();
  root.hidden = false;
  root.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => root.classList.add('open'));
}
window.openProjectAlbumLightbox = openProjectAlbumLightbox;

function getProjectById(projectId) {
  return allProjects.find((project) => project.id === projectId) || null;
}

function getPostBySlug(slug) {
  return allPosts.find((post) => post.slug === slug) || null;
}

function getResourceBySlug(slug) {
  return allResources.find((resource) => resource.slug === slug && !resource.external) || null;
}

function categoryToTag(category) {
  if (!category || category === 'all') return 'all';
  return String(category).toLowerCase().replace(/\s+/g, '-');
}

function tagToCategory(tag) {
  if (!tag || tag === 'all') return 'all';
  const normalized = String(tag).toLowerCase();
  const match = ['all', 'Development', 'Life', 'Projects', 'Politics']
    .find((category) => categoryToTag(category) === normalized);
  return match || 'all';
}

function normalizeSort(sort) {
  const supported = new Set(['newest', 'oldest', 'shortest', 'longest']);
  return supported.has(sort) ? sort : 'newest';
}

function normalizeResourceSort(sort) {
  const supported = new Set(['newest', 'oldest', 'title']);
  return supported.has(sort) ? sort : 'newest';
}

function normalizeProjectSort(sort) {
  const supported = new Set(['featured', 'title', 'status', 'type']);
  return supported.has(sort) ? sort : 'featured';
}

function sortResources(resources, sortBy = 'newest') {
  const sorted = resources.slice();
  if (sortBy === 'oldest') {
    sorted.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    return sorted;
  }
  if (sortBy === 'title') {
    sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    return sorted;
  }
  sorted.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  return sorted;
}

function sortProjectsList(projects, sortBy = 'featured') {
  const sorted = projects.slice();
  if (sortBy === 'title') {
    sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    return sorted;
  }
  if (sortBy === 'status') {
    sorted.sort((a, b) => String(a.status || '').localeCompare(String(b.status || '')));
    return sorted;
  }
  if (sortBy === 'type') {
    sorted.sort((a, b) => String(a.type || '').localeCompare(String(b.type || '')));
    return sorted;
  }
  return sorted;
}

function sortPosts(posts, sortBy = 'newest') {
  const sorted = posts.slice();
  if (sortBy === 'oldest') {
    sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    return sorted;
  }
  if (sortBy === 'shortest') {
    sorted.sort((a, b) => (a.readTime - b.readTime) || (new Date(b.date) - new Date(a.date)));
    return sorted;
  }
  if (sortBy === 'longest') {
    sorted.sort((a, b) => (b.readTime - a.readTime) || (new Date(b.date) - new Date(a.date)));
    return sorted;
  }
  sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
  return sorted;
}

function setHubViewParam(view, options = {}) {
  const url = new URL(window.location.href);
  const shouldReplace = options.replace !== false;

  ['post', 'project', 'resource'].forEach((param) => {
    url.searchParams.delete(param);
  });
  url.searchParams.set('view', view);

  if (view === 'posts') {
    url.searchParams.set('tag', categoryToTag(currentCategory));
    url.searchParams.set('sort', currentSort);
    url.searchParams.set('page', String(currentPage));
  } else {
    ['tag', 'sort', 'page'].forEach((param) => url.searchParams.delete(param));
  }

  history[shouldReplace ? 'replaceState' : 'pushState']({ view }, '', `${url.pathname}${url.search}`);
}

function updatePostsUrlState(options = {}) {
  const url = new URL(window.location.href);
  const shouldReplace = options.replace !== false;
  if (url.searchParams.get('post') || url.searchParams.get('project') || url.searchParams.get('resource')) return;
  url.searchParams.set('view', 'posts');
  url.searchParams.set('tag', categoryToTag(currentCategory));
  url.searchParams.set('sort', currentSort);
  url.searchParams.set('page', String(currentPage));
  history[shouldReplace ? 'replaceState' : 'pushState']({ view: 'posts' }, '', `${url.pathname}${url.search}`);
}

function normalizeHubView(view) {
  const supportedViews = new Set(['home', 'projects', 'resources', 'posts', 'games']);
  return supportedViews.has(view) ? view : 'home';
}

function updateHubActionLabels() {
  const projectsBtn = document.getElementById('projects-view-all');
  const resourcesBtn = document.getElementById('resources-view-all');
  const postsBtn = document.getElementById('posts-view-all');
  if (projectsBtn) {
    projectsBtn.textContent = currentHubView === 'projects' ? 'Back to home' : 'View all projects';
  }
  if (resourcesBtn) {
    resourcesBtn.textContent = currentHubView === 'resources' ? 'Back to home' : 'View all resources';
  }
  if (postsBtn) {
    postsBtn.textContent = currentHubView === 'posts' ? 'Back to home' : 'View all posts';
  }
}

function scrollHubViewIntoFocus(view) {
  const scrollTarget = view === 'projects'
    ? document.getElementById('projects-showcase')
    : view === 'resources'
      ? document.getElementById('resources-showcase')
      : view === 'games'
        ? document.getElementById('games-showcase')
      : view === 'posts'
        ? document.getElementById('posts-browser')
        : document.querySelector('.blog-section');
  if (!scrollTarget || typeof window.scrollToElementWithHeaderOffset !== 'function') return;
  window.scrollToElementWithHeaderOffset(scrollTarget, view === 'posts' ? 12 : 8);
}

function setContentHubView(view = 'home', options = {}) {
  const normalizedView = normalizeHubView(view);
  currentHubView = normalizedView;
  const useLoader = options.showLoader !== false;

  if (useLoader && typeof window.showPageLoader === 'function') {
    window.showPageLoader();
  }

  if (normalizedView !== 'resources') {
    currentResourceTypeFilter = 'all';
  }
  setupHubActions();

  const blogSection = document.querySelector('.blog-section');
  if (blogSection) {
    blogSection.dataset.hubView = normalizedView;
  }

  const featuredSection = document.getElementById('featured-section');
  if (featuredSection) {
    featuredSection.style.display = normalizedView === 'home' ? 'grid' : 'none';
  }

  setupProjectsShowcase({ preview: normalizedView === 'home' });
  setupResourcesShowcase({ preview: normalizedView === 'home' });
  renderPostsPreview();
  setupToolsPreview();
  setupGamesShowcase();
  updateHubActionLabels();
  setLeftRailContext(normalizedView);

  if (normalizedView === 'posts') {
    ensureBlogControlsReady();
    const sortControl = document.getElementById('posts-sort');
    if (sortControl) {
      sortControl.value = currentSort;
    }
    filterPosts({ resetPage: false, updateUrl: false, suppressScroll: true });
  }

  if (!options.suppressNavSync && typeof window.setTopNavActive === 'function') {
    const navTarget = normalizedView === 'projects'
      ? 'nav-projects'
      : normalizedView === 'resources'
        ? 'nav-resources'
        : normalizedView === 'games'
          ? 'nav-games'
          : normalizedView === 'posts'
            ? 'nav-blog'
            : '';
    const navLabel = normalizedView === 'posts'
      ? 'Posts'
      : (normalizedView === 'projects'
        ? 'Projects'
        : (normalizedView === 'resources' ? 'Resources' : (normalizedView === 'games' ? 'Games' : 'Homepage')));
    window.setTopNavActive(navTarget, { label: navLabel });
  }

  if (options.syncUrl !== false) {
    if (normalizedView === 'posts') {
      updatePostsUrlState({ replace: options.replaceState !== false });
    } else {
      setHubViewParam(normalizedView, { replace: options.replaceState !== false });
    }
  }

  if (options.scrollToSection) {
    scrollHubViewIntoFocus(normalizedView);
  }

  if (useLoader && typeof window.hidePageLoader === 'function') {
    window.hidePageLoader(220);
  }
}

function setupHubActions() {
  if (hubActionsInitialized) return;

  const projectsBtn = document.getElementById('projects-view-all');
  const resourcesBtn = document.getElementById('resources-view-all');
  const postsBtn = document.getElementById('posts-view-all');
  const toolsBtn = document.getElementById('tools-view-all');

  if (projectsBtn) {
    projectsBtn.addEventListener('click', () => {
      setContentHubView(currentHubView === 'projects' ? 'home' : 'projects', {
        replaceState: false,
        scrollToSection: true
      });
    });
  }

  if (resourcesBtn) {
    resourcesBtn.addEventListener('click', () => {
      setContentHubView(currentHubView === 'resources' ? 'home' : 'resources', {
        replaceState: false,
        scrollToSection: true
      });
    });
  }

  if (postsBtn) {
    postsBtn.addEventListener('click', () => {
      setContentHubView(currentHubView === 'posts' ? 'home' : 'posts', {
        replaceState: false,
        scrollToSection: true
      });
    });
  }

  if (toolsBtn) {
    toolsBtn.addEventListener('click', () => {
      if (typeof window.showToolsDashboardView === 'function') {
        window.showToolsDashboardView();
      }
    });
  }

  hubActionsInitialized = true;
}

// Load all posts from markdown files
async function loadPosts() {
  if (allPosts.length > 0) {
    return allPosts;
  }

  // Bolt ⚡ Optimization: Parallel fetch and parse for all posts
  const postPromises = POST_MANIFEST.map(async (filename) => {
    try {
      console.log(`Attempting to load: posts/${filename}`);
      const response = await fetch(`./posts/${filename}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const content = await response.text();
      console.log(`Loaded ${filename}, length: ${content.length}`);

      const { frontmatter, body } = parseFrontmatter(content);

      // Derive slug from filename if not in frontmatter
      const slug = frontmatter.slug || filename.replace('.md', '');

      // Calculate reading time
      const readTime = frontmatter.readTime || calculateReadingTime(body);

      // Construct post object
      return {
        slug,
        title: frontmatter.title || 'Untitled',
        date: frontmatter.date || new Date().toISOString().split('T')[0],
        category: frontmatter.category || 'uncategorized',
        excerpt: frontmatter.excerpt || generateExcerpt(body),
        cover: frontmatter.cover || `assets/images/${slug}.jpg`,
        readTime,
        body,
        filename
      };
    } catch (error) {
      console.error(`Error loading post ${filename}:`, error);
      return null;
    }
  });

  const posts = (await Promise.all(postPromises)).filter(Boolean);

  // Sort by date (newest first)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log(`Total posts loaded: ${posts.length}`);

  allPosts = posts;
  filteredPosts = posts;
  return posts;
}

async function loadResources() {
  if (allResources.length > 0) return allResources;

  // Bolt ⚡ Optimization: Parallel fetch and parse for internal resources
  const resourcePromises = RESOURCE_MANIFEST.map(async (filename) => {
    try {
      const response = await fetch(`./resources/${filename}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const content = await response.text();
      const { frontmatter, body } = parseFrontmatter(content);
      const slug = frontmatter.slug || filename.replace('.md', '');
      const readTime = frontmatter.readTime || calculateReadingTime(body);

      return {
        id: slug,
        slug,
        title: frontmatter.title || slug,
        description: frontmatter.excerpt || generateExcerpt(body, 24),
        summary: frontmatter.summary || generateExcerpt(body, 50),
        date: frontmatter.date || new Date().toISOString().split('T')[0],
        type: frontmatter.type || 'Tutorial',
        icon: frontmatter.icon || 'fas fa-book-open',
        cover: frontmatter.cover || '',
        readTime,
        downloads: parseDownloads(frontmatter.downloads),
        steps: parseSteps(frontmatter, body),
        body,
        filename,
        external: false
      };
    } catch (error) {
      console.error(`Error loading resource ${filename}:`, error);
      return null;
    }
  });

  const internalResources = (await Promise.all(resourcePromises)).filter(Boolean);
  internalResources.sort((a, b) => new Date(b.date) - new Date(a.date));

  const externalResources = EXTERNAL_RESOURCES.map((resource) => ({
    ...resource,
    slug: resource.id,
    summary: resource.description,
    date: '',
    readTime: '',
    cover: '',
    downloads: [],
    steps: [],
    external: true,
    body: ''
  }));

  allResources = [...internalResources, ...externalResources].filter((resource) => {
    const title = String(resource.title || '').trim();
    if (!title) return false;
    if (resource.external) return Boolean(resource.url);
    return String(resource.body || '').trim().length > 0;
  });
  return allResources;
}

async function loadProjects() {
  if (allProjects.length > 0) return allProjects;

  // Bolt ⚡ Optimization: Parallel fetch and parse for all projects
  const projectPromises = PROJECT_MANIFEST.map(async (filename) => {
    try {
      const response = await fetch(`./projects/${filename}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const content = await response.text();
      const { frontmatter, body } = parseFrontmatter(content);
      const slug = frontmatter.slug || filename.replace('.md', '');
      const description = frontmatter.description || frontmatter.excerpt || generateExcerpt(body, 24);
      const summary = frontmatter.summary || generateExcerpt(body, 50);

      return {
        id: frontmatter.id || slug,
        slug,
        title: frontmatter.title || slug,
        description,
        summary,
        type: frontmatter.type || 'Project',
        status: frontmatter.status || 'Active',
        cover: frontmatter.cover || `assets/images/${slug}.png`,
        logo: frontmatter.logo || frontmatter.cover || `assets/images/${slug}.png`,
        tags: parseInlineList(frontmatter.tags),
        relatedPosts: parseInlineList(frontmatter.relatedPosts),
        album: parseJsonArray(frontmatter.album),
        links: {
          repo: frontmatter.repo || '',
          live: frontmatter.live || '',
          video: frontmatter.video || ''
        },
        date: frontmatter.date || ''
      };
    } catch (error) {
      console.error(`Error loading project ${filename}:`, error);
      return null;
    }
  });

  allProjects = (await Promise.all(projectPromises)).filter(Boolean);
  return allProjects;
}

function withImageFallback(imageEl, fallbackSrc) {
  if (!imageEl) return;
  imageEl.addEventListener('error', () => {
    if (fallbackSrc && imageEl.src !== fallbackSrc) {
      imageEl.src = fallbackSrc;
      return;
    }
    imageEl.closest('.card-media-wrap')?.classList.add('no-media');
  });
}

function createPostCardMarkup(post, options = {}) {
  const compact = Boolean(options.compact);
  const cover = post.cover || `assets/images/${post.slug}.png`;
  const compactDate = formatCompactDate(post.date);
  const category = formatCategory(post.category);
  const readTime = `${post.readTime} min`;
  const excerpt = clampWords(post.excerpt, compact ? 20 : 26);
  return createMediaBackdropCard({
    tag: 'button',
    typeClass: 'resource-card resource-card-button post-as-resource-card',
    size: 'md',
    title: post.title,
    description: excerpt,
    cover,
    chips: [category].filter(Boolean),
    meta: [compactDate, readTime],
    iconHtml: `<i class="${getPostCategoryIcon(post.category)}" aria-hidden="true"></i>`,
    actionHtml: '<i class="fas fa-arrow-right" aria-hidden="true"></i>',
    showExcerpt: true,
    showMeta: true,
    ctaText: compact ? '' : 'Read Post →',
    dataAttrs: `role="listitem" data-post-slug="${post.slug}" aria-label="Open post"`
  });
}

function attachPostCardHandlers(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll('[data-post-slug]').forEach((card) => {
    card.addEventListener('click', () => {
      const slug = card.getAttribute('data-post-slug');
      if (slug) showSinglePost(slug);
    });
  });
  rootEl.querySelectorAll('.media-card-image').forEach((imageEl) => {
    withImageFallback(imageEl, 'assets/images/Markdowntest.png');
  });
  rootEl.querySelectorAll('.media-card-avatar').forEach((imageEl) => {
    withImageFallback(imageEl, imageEl.getAttribute('data-fallback-src'));
  });
}

function renderPostsPreview() {
  const previewGrid = document.getElementById('posts-preview-grid');
  if (!previewGrid) return;

  const previewPosts = sortPosts(allPosts, 'newest').slice(0, homePreviewLimits.posts);
  previewGrid.innerHTML = previewPosts.length
    ? previewPosts.map((post) => createPostCardMarkup(post, { compact: true })).join('')
    : '<p class="posts-empty">No posts yet.</p>';

  attachPostCardHandlers(previewGrid);
}

// Render post cards in list view with pagination
function renderPostsList(posts, page = 1) {
  const container = document.getElementById('posts-list');
  const pagination = document.getElementById('pagination');

  if (!container || !pagination) {
    console.error('posts list containers not found');
    return;
  }

  if (posts.length === 0) {
    container.innerHTML = '<p class="posts-empty">No posts found.</p>';
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(posts.length / postsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * postsPerPage;
  const postsToShow = posts.slice(startIndex, startIndex + postsPerPage);

  container.innerHTML = postsToShow.map((post) => createPostCardMarkup(post)).join('');
  attachPostCardHandlers(container);

  if (allPosts.length > 0 && currentPage === 1 && currentHubView === 'home') {
    setupFeaturedPost(sortPosts(allPosts, 'newest')[0]);
  }

  renderPagination(totalPages, safePage);

  if (!suppressPostsListScroll && currentHubView === 'posts') {
    const searchBar = document.getElementById('blog-search-bar');
    if (searchBar && typeof window.scrollToElementWithHeaderOffset === 'function') {
      window.scrollToElementWithHeaderOffset(searchBar, 10);
    }
  }
}

function createProjectCardMarkup(project) {
  const iconHtml = project.logo
    ? `<img class="media-card-avatar" src="${project.logo}" alt="${escapeHtml(project.title)} logo" data-fallback-src="${project.cover}">`
    : `<i class="${getProjectTypeIcon(project.type)}" aria-hidden="true"></i>`;
  const actionHtml = project.links?.repo
    ? '<i class="fab fa-github" aria-hidden="true"></i>'
    : project.links?.live
      ? '<i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>'
      : '';
  const stack = Array.isArray(project.tags) && project.tags.length ? project.tags[0] : '';
  return createMediaBackdropCard({
    tag: 'button',
    typeClass: 'project-card',
    size: 'md',
    title: project.title,
    description: project.description,
    cover: project.cover,
    chips: [project.type, project.status].filter(Boolean),
    meta: [stack].filter(Boolean),
    iconHtml,
    actionHtml,
    showExcerpt: Boolean(project.description),
    showMeta: true,
    ctaText: 'View Project →',
    dataAttrs: `role="listitem" data-project-id="${project.id}" aria-label="Open project"`
  });
}

function getFilteredProjects() {
  let items = allProjects.slice();
  if (currentProjectFilter !== 'all') {
    items = items.filter((project) => String(project.type || '').trim() === currentProjectFilter);
  }
  if (currentProjectSearch) {
    const query = currentProjectSearch.toLowerCase();
    items = items.filter((project) =>
      `${project.title} ${project.description} ${(project.tags || []).join(' ')} ${project.type} ${project.status}`
        .toLowerCase()
        .includes(query)
    );
  }
  return sortProjectsList(items, currentProjectSort);
}

function renderProjectsList(items, page = 1) {
  const projectsGrid = document.getElementById('projects-grid');
  const pagination = document.getElementById('projects-pagination');
  if (!projectsGrid || !pagination) return;

  if (!items.length) {
    projectsGrid.innerHTML = '<p class="posts-empty">No projects yet.</p>';
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(items.length / projectsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * projectsPerPage;
  const pageItems = items.slice(startIndex, startIndex + projectsPerPage);
  projectsGrid.innerHTML = pageItems.map((project) => createProjectCardMarkup(project)).join('');

  projectsGrid.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('click', () => {
      const projectId = card.getAttribute('data-project-id');
      if (projectId) showProjectShowcase(projectId);
    });
  });

  projectsGrid.querySelectorAll('.media-card-image').forEach((imageEl) => {
    withImageFallback(imageEl, 'assets/images/Markdowntest.png');
  });

  projectsGrid.querySelectorAll('.media-card-avatar').forEach((imageEl) => {
    withImageFallback(imageEl, imageEl.getAttribute('data-fallback-src'));
  });

  renderPaginationControls(pagination, totalPages, safePage, (nextPage) => {
    currentProjectPage = nextPage;
    renderProjectsList(items, nextPage);
  });
}

function setupProjectsShowcase(options = {}) {
  const projectsGrid = document.getElementById('projects-grid');
  if (!projectsGrid) return;
  const pagination = document.getElementById('projects-pagination');

  const preview = options.preview !== false;
  if (preview) {
    const items = allProjects.slice(0, homePreviewLimits.projects);
    projectsGrid.innerHTML = items.length
      ? items.map((project) => createProjectCardMarkup(project)).join('')
      : '<p class="posts-empty">No projects yet.</p>';
    if (pagination) pagination.innerHTML = '';
    projectsGrid.querySelectorAll('.project-card').forEach((card) => {
      card.addEventListener('click', () => {
        const projectId = card.getAttribute('data-project-id');
        if (projectId) showProjectShowcase(projectId);
      });
    });
    projectsGrid.querySelectorAll('.media-card-image').forEach((imageEl) => {
      withImageFallback(imageEl, 'assets/images/Markdowntest.png');
    });
    projectsGrid.querySelectorAll('.media-card-avatar').forEach((imageEl) => {
      withImageFallback(imageEl, imageEl.getAttribute('data-fallback-src'));
    });
    return;
  }

  const items = getFilteredProjects();
  currentProjectPage = Math.min(Math.max(1, currentProjectPage), Math.max(1, Math.ceil(items.length / projectsPerPage)));
  renderProjectsList(items, currentProjectPage);
}

function createResourceCardMarkup(resource) {
  const iconClass = resource.icon || getResourceTypeIcon(resource.type);
  const iconHtml = `<i class="${iconClass}" aria-hidden="true"></i>`;
  const meta = resource.external
    ? [resource.type || 'Resource', 'External'].filter(Boolean)
    : [resource.type || 'Resource'].filter(Boolean);

  if (resource.external) {
    return createMediaBackdropCard({
      tag: 'a',
      href: resource.url,
      typeClass: 'resource-card',
      size: 'md',
      title: resource.title,
      description: resource.description,
      cover: resource.cover,
      chips: [resource.type].filter(Boolean),
      meta,
      iconHtml,
      actionHtml: '<i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>',
      showExcerpt: true,
      showMeta: true,
      ctaText: '',
      dataAttrs: `role="listitem" aria-label="Open resource"`
    });
  }

  return createMediaBackdropCard({
    tag: 'button',
    typeClass: 'resource-card resource-card-button',
    size: 'md',
    title: resource.title,
    description: resource.description,
    cover: resource.cover,
    chips: [resource.type].filter(Boolean),
    meta,
    iconHtml,
    actionHtml: '<i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>',
    showExcerpt: true,
    showMeta: true,
    ctaText: '',
    dataAttrs: `role="listitem" data-resource-slug="${resource.slug}" aria-label="Open resource"`
  });
}

function getFilteredResources() {
  let items = allResources.slice();
  if (currentResourceTypeFilter !== 'all') {
    items = items.filter((resource) => String(resource.type || '').trim() === currentResourceTypeFilter);
  }
  if (currentResourceSearch) {
    const query = currentResourceSearch.toLowerCase();
    items = items.filter((resource) =>
      `${resource.title} ${resource.description} ${resource.summary || ''} ${resource.type}`
        .toLowerCase()
        .includes(query)
    );
  }
  return sortResources(items, currentResourceSort);
}

function renderResourcesList(items, page = 1) {
  const resourcesGrid = document.getElementById('resources-grid');
  const pagination = document.getElementById('resources-pagination');
  if (!resourcesGrid || !pagination) return;

  if (!items.length) {
    resourcesGrid.innerHTML = '<p class="posts-empty">No resources available yet.</p>';
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(items.length / resourcesPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * resourcesPerPage;
  const pageItems = items.slice(startIndex, startIndex + resourcesPerPage);

  resourcesGrid.innerHTML = pageItems.map((resource) => createResourceCardMarkup(resource)).join('');

  resourcesGrid.querySelectorAll('.resource-card-button').forEach((button) => {
    button.addEventListener('click', () => {
      const slug = button.getAttribute('data-resource-slug');
      if (slug) showResourcePage(slug);
    });
  });

  resourcesGrid.querySelectorAll('.media-card-image').forEach((imageEl) => {
    withImageFallback(imageEl, 'assets/images/Markdowntest.png');
  });

  renderPaginationControls(pagination, totalPages, safePage, (nextPage) => {
    currentResourcePage = nextPage;
    renderResourcesList(items, nextPage);
  });
}

function setupResourcesShowcase(options = {}) {
  const resourcesGrid = document.getElementById('resources-grid');
  if (!resourcesGrid) return;
  const pagination = document.getElementById('resources-pagination');

  const preview = options.preview !== false;
  if (preview) {
    const resources = allResources.slice(0, homePreviewLimits.resources);
    resourcesGrid.innerHTML = resources.length
      ? resources.map((resource) => createResourceCardMarkup(resource)).join('')
      : '<p class="posts-empty">No resources available yet.</p>';
    if (pagination) pagination.innerHTML = '';
    resourcesGrid.querySelectorAll('.resource-card-button').forEach((button) => {
      button.addEventListener('click', () => {
        const slug = button.getAttribute('data-resource-slug');
        if (slug) showResourcePage(slug);
      });
    });
    resourcesGrid.querySelectorAll('.media-card-image').forEach((imageEl) => {
      withImageFallback(imageEl, 'assets/images/Markdowntest.png');
    });
    return;
  }

  const items = getFilteredResources();
  currentResourcePage = Math.min(Math.max(1, currentResourcePage), Math.max(1, Math.ceil(items.length / resourcesPerPage)));
  renderResourcesList(items, currentResourcePage);
}

function setupToolsPreview() {
  const toolsGrid = document.getElementById('tools-preview-grid');
  if (!toolsGrid) return;
  const previewTools = TOOLS_PREVIEW.slice(0, homePreviewLimits.tools);
  toolsGrid.innerHTML = previewTools.map((tool) => createMediaBackdropCard({
    tag: 'button',
    typeClass: 'tools-preview-card',
    size: 'sm',
    title: tool.title,
    description: '',
    cover: '',
    chips: ['Tools'],
    meta: [],
    iconHtml: `<i class="fas ${tool.icon}" aria-hidden="true"></i>`,
    actionHtml: '<i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>',
    showExcerpt: false,
    showMeta: false,
    ctaText: '',
    dataAttrs: `role="listitem" data-tool-preview-id="${tool.id}" aria-label="Open tools workspace"`
  })).join('');

  toolsGrid.querySelectorAll('.tools-preview-card').forEach((button) => {
    button.addEventListener('click', () => {
      if (typeof window.showToolsDashboardView === 'function') {
        window.showToolsDashboardView();
      }
    });
  });
}

function setupGamesShowcase() {
  const gamesGrid = document.getElementById('games-grid');
  if (!gamesGrid) return;
  gamesGrid.innerHTML = GAMES_LIST.map((game) => createMediaBackdropCard({
    tag: 'article',
    typeClass: 'resource-card games-card',
    size: 'sm',
    title: game.title,
    description: game.description,
    cover: game.cover || '',
    chips: game.chips || ['Game'],
    meta: game.meta || [],
    iconHtml: `<i class="fas ${game.icon || 'fa-gamepad'}" aria-hidden="true"></i>`,
    actionHtml: '',
    showExcerpt: true,
    showMeta: false,
    ctaText: '',
    dataAttrs: `role="listitem" aria-label="Game: ${escapeHtml(game.title)}"`
  })).join('');
}

// Setup featured post section
function setupFeaturedPost(post) {
  const featuredSection = document.getElementById('featured-section');
  const featuredTitle = document.getElementById('featured-title');
  const featuredExcerpt = document.getElementById('featured-excerpt');
  const featuredDate = document.getElementById('featured-date');
  const featuredCategory = document.getElementById('featured-category');
  const featuredReadtime = document.getElementById('featured-readtime');
  const featuredBtn = document.getElementById('featured-btn');
  
  if (featuredSection && post) {
    featuredSection.style.display = 'grid';
    featuredTitle.textContent = post.title;
    featuredExcerpt.textContent = post.excerpt;
    featuredDate.textContent = formatDate(post.date);
    featuredCategory.textContent = formatCategory(post.category);
    featuredReadtime.textContent = `${post.readTime} min read`;
    featuredBtn.onclick = () => showSinglePost(post.slug);
  }
}

function renderPaginationControls(container, totalPages, currentPage, onChange) {
  if (!container) {
    console.error('pagination container not found');
    return;
  }

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const pages = [];
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push('ellipsis-start');
  }
  for (let i = startPage; i <= endPage; i += 1) {
    pages.push(i);
  }
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pages.push('ellipsis-end');
    pages.push(totalPages);
  }

  container.innerHTML = `
    <div class="pagination-controls" tabindex="0" aria-label="Pagination controls">
      <button class="pagination-btn pagination-nav" type="button" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
      ${pages.map((entry) => {
        if (String(entry).startsWith('ellipsis')) {
          return '<span class="pagination-ellipsis" aria-hidden="true">...</span>';
        }
        const pageNum = Number(entry);
        return `<button class="pagination-btn${pageNum === currentPage ? ' active' : ''}" type="button" data-page="${pageNum}" aria-current="${pageNum === currentPage ? 'page' : 'false'}">${pageNum}</button>`;
      }).join('')}
      <button class="pagination-btn pagination-nav" type="button" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
    </div>
  `;

  container.querySelectorAll('.pagination-btn[data-page]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetPage = Number.parseInt(button.getAttribute('data-page') || '', 10);
      if (Number.isInteger(targetPage)) {
        onChange(targetPage);
      }
    });
  });

  const controls = container.querySelector('.pagination-controls');
  if (controls) {
    controls.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' && currentPage > 1) {
        event.preventDefault();
        onChange(currentPage - 1);
      }
      if (event.key === 'ArrowRight' && currentPage < totalPages) {
        event.preventDefault();
        onChange(currentPage + 1);
      }
    });
  }
}

// Render pagination controls
function renderPagination(totalPages, currentPage) {
  const paginationContainer = document.getElementById('pagination');
  renderPaginationControls(paginationContainer, totalPages, currentPage, (nextPage) => {
    changePage(nextPage);
  });
}

function clearPostNavigation() {
  const prevLink = document.getElementById('prev-post');
  const nextLink = document.getElementById('next-post');
  const stickyPrevBtn = document.getElementById('sticky-prev-post');
  const stickyNextBtn = document.getElementById('sticky-next-post');

  if (prevLink) {
    prevLink.style.display = 'none';
    prevLink.onclick = null;
  }
  if (nextLink) {
    nextLink.style.display = 'none';
    nextLink.onclick = null;
  }
  if (stickyPrevBtn) {
    stickyPrevBtn.disabled = true;
    stickyPrevBtn.title = 'Not available in project view';
    stickyPrevBtn.onclick = null;
  }
  if (stickyNextBtn) {
    stickyNextBtn.disabled = true;
    stickyNextBtn.title = 'Not available in project view';
    stickyNextBtn.onclick = null;
  }
}

function renderProjectShowcase(projectId) {
  const project = getProjectById(projectId);
  const postContent = document.getElementById('post-content');
  const breadcrumb = document.getElementById('breadcrumb');
  const breadcrumbPost = document.getElementById('breadcrumb-post');
  const commentsSection = document.getElementById('comments-section');

  if (!project || !postContent) {
    if (postContent) {
      postContent.innerHTML = '<p>Project not found.</p>';
    }
    return;
  }

  const relatedPosts = project.relatedPosts
    .map((slug) => getPostBySlug(slug))
    .filter(Boolean);
  const albumItems = Array.isArray(project.album)
    ? project.album.filter((item) => item && item.src)
    : [];

  const linkButtons = [];
  if (project.links.repo) {
    linkButtons.push(`<a class="btn btn-compact" href="${project.links.repo}" target="_blank" rel="noopener noreferrer"><i class="fab fa-github" aria-hidden="true"></i> Repo</a>`);
  }
  if (project.links.live) {
    linkButtons.push(`<a class="btn btn-compact" href="${project.links.live}" target="_blank" rel="noopener noreferrer"><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> Live</a>`);
  }
  if (project.links.video) {
    linkButtons.push(`<a class="btn btn-compact" href="${project.links.video}" target="_blank" rel="noopener noreferrer"><i class="fas fa-play" aria-hidden="true"></i> Video</a>`);
  }

  postContent.innerHTML = `
    <article class="project-profile">
      <header class="project-profile-hero" data-cover-src="${project.cover}">
        <div class="project-profile-veil"></div>
        <div class="project-profile-headline">
          <img class="project-profile-logo" src="${project.logo}" alt="${project.title} logo" data-fallback-src="${project.cover}" data-no-viewer="true">
          <div class="project-profile-meta">
            <span class="project-chip">${project.type}</span>
            <span class="project-chip status">${project.status}</span>
          </div>
          <h1>${project.title}</h1>
          <p>${project.summary}</p>
          <div class="project-profile-actions">
            ${linkButtons.join('')}
          </div>
        </div>
      </header>

      <section id="project-scope" class="project-profile-block">
        <h2>Scope</h2>
        <div class="project-tag-list">
          ${project.tags.map((tag) => `<span class="project-tag">${tag}</span>`).join('')}
        </div>
      </section>

      ${albumItems.length
        ? `
          <section id="project-album" class="project-profile-block">
            <h2>Picture Album</h2>
            <div class="project-album-grid">
              ${albumItems.map((item, index) => `
                <button class="project-album-item" type="button" data-album-index="${index}" aria-label="Open album image ${index + 1}">
                  <img src="${item.src}" alt="${escapeHtml(item.alt || item.caption || `Project image ${index + 1}`)}" loading="lazy" decoding="async">
                  <span>${escapeHtml(item.caption || `Image ${index + 1}`)}</span>
                </button>
              `).join('')}
            </div>
          </section>
        `
        : ''
      }

      <section id="project-related" class="project-profile-block">
        <h2>Related Posts</h2>
        <div class="project-related-list">
          ${relatedPosts.length
            ? relatedPosts.map((post) => `
              <button class="project-related-item" type="button" data-related-post="${post.slug}" aria-label="Open related post ${post.title}">
                <img src="${post.cover}" alt="${post.title}" onerror="this.style.display='none'" data-no-viewer="true">
                <div>
                  <h3>${post.title}</h3>
                  <p>${post.excerpt}</p>
                </div>
              </button>
            `).join('')
            : '<p class="project-empty">No related posts yet.</p>'
          }
        </div>
      </section>
    </article>
  `;

  postContent.querySelectorAll('.project-related-item').forEach((item) => {
    item.addEventListener('click', () => {
      const slug = item.getAttribute('data-related-post');
      if (slug) showSinglePost(slug);
    });
  });

  postContent.querySelectorAll('.project-album-item').forEach((item) => {
    item.addEventListener('click', () => {
      const index = Number.parseInt(item.getAttribute('data-album-index') || '0', 10);
      openProjectAlbumLightbox(albumItems, index);
    });
  });
  postContent.querySelectorAll('.project-album-item img').forEach((imageEl) => {
    withImageFallback(imageEl, project.cover);
  });

  const projectLogo = postContent.querySelector('.project-profile-logo');
  const projectHero = postContent.querySelector('.project-profile-hero');
  if (projectHero) {
    const coverSrc = projectHero.getAttribute('data-cover-src');
    if (coverSrc) {
      projectHero.style.backgroundImage = `url("${coverSrc}")`;
    }
  }
  if (projectLogo) {
    projectLogo.addEventListener('error', () => {
      const fallback = projectLogo.getAttribute('data-fallback-src');
      if (fallback && projectLogo.src !== fallback) {
        projectLogo.src = fallback;
      }
    });
  }

  if (breadcrumb && breadcrumbPost) {
    breadcrumbPost.textContent = project.title;
    breadcrumb.style.display = 'flex';
    const crumb = breadcrumb.querySelector('.breadcrumb-item');
    if (crumb) crumb.textContent = 'Projects';
  }

  if (commentsSection) {
    commentsSection.style.display = 'none';
  }

  const tocNav = document.getElementById('toc-nav');
  if (tocNav) {
    const tocItems = [
      { id: 'project-scope', label: 'Scope' },
      albumItems.length ? { id: 'project-album', label: 'Picture Album' } : null,
      { id: 'project-related', label: 'Related Posts' }
    ].filter(Boolean);
    tocNav.innerHTML = `
      <div class="toc-list">
        ${tocItems.map((item) => `
          <div class="toc-item toc-level-2">
            <a href="javascript:void(0);" class="toc-link" onclick="smoothScrollTo('${item.id}'); return false;">${item.label}</a>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (typeof window.registerViewerImages === 'function') {
    window.registerViewerImages(postContent);
  }
  if (typeof window.setReactionContext === 'function') {
    window.setReactionContext('');
  }

  clearPostNavigation();
  setupTOC();
  if (typeof window.setShareContext === 'function') {
    window.setShareContext({
      title: `Check out project "${project.title}" on Nomu's site`,
      url: `${window.location.origin}${window.location.pathname}?project=${project.id}`
    });
  } else {
    window.__pendingShareContext = {
      title: `Check out project "${project.title}" on Nomu's site`,
      url: `${window.location.origin}${window.location.pathname}?project=${project.id}`
    };
  }
}

function showProjectShowcase(projectId, options = {}) {
  closeProjectAlbumLightbox();
  const project = getProjectById(projectId);
  if (!project) return false;

  const pageLoader = document.getElementById('page-loader');
  const heroSection = document.getElementById('hero');
  const blogSection = document.querySelector('.blog-section');
  const singleView = document.getElementById('single-post-view');
  const featuredSection = document.getElementById('featured-section');

  if (pageLoader) {
    pageLoader.classList.remove('hidden');
  }
  if (typeof window.setTopNavActive === 'function') {
    window.setTopNavActive('nav-projects');
  }
  setRailMode('hidden');
  closeRailDrawer();

  setTimeout(() => {
    if (heroSection) heroSection.style.display = 'none';
    if (blogSection) blogSection.style.display = 'none';
    if (singleView) singleView.style.display = 'block';
    if (featuredSection) featuredSection.style.display = 'none';
    renderProjectShowcase(projectId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (pageLoader) {
      pageLoader.classList.add('hidden');
    }
  }, 260);

  if (options.pushState !== false) {
    history.pushState({ project: projectId }, '', `?project=${encodeURIComponent(projectId)}`);
  }
  return true;
}
window.showProjectShowcase = showProjectShowcase;

function renderResourcePage(resourceSlug) {
  const resource = getResourceBySlug(resourceSlug);
  const postContent = document.getElementById('post-content');
  const breadcrumb = document.getElementById('breadcrumb');
  const breadcrumbPost = document.getElementById('breadcrumb-post');
  const commentsSection = document.getElementById('comments-section');

  if (!resource || !postContent) {
    if (postContent) {
      postContent.innerHTML = '<p>Resource not found.</p>';
    }
    return;
  }

  const htmlContent = parseMarkdown(resource.body || '');
  const processedHtml = addHeadingIds(htmlContent);
  const tocHtml = generateTOCFromProcessed(processedHtml);
  const downloads = Array.isArray(resource.downloads) ? resource.downloads.filter((item) => item && item.url) : [];
  const steps = Array.isArray(resource.steps) ? resource.steps.filter(Boolean) : [];
  const resourceMeta = [
    resource.date ? formatDate(resource.date) : '',
    resource.type || '',
    resource.readTime ? `${resource.readTime} min read` : ''
  ].filter(Boolean);

  postContent.innerHTML = `
    <article class="resource-profile">
      <header class="post-header resource-profile-header">
        <div class="post-header-content resource-profile-copy">
          <h1>${resource.title}</h1>
          ${resourceMeta.length
            ? `<div class="post-meta">${resourceMeta.map((item, i) => `${i ? '<span class="meta-sep">&bull;</span>' : ''}<span>${item}</span>`).join('')}</div>`
            : ''
          }
          ${resource.description ? `<p class="post-excerpt">${resource.description}</p>` : ''}
          ${steps.length || downloads.length
            ? `
              <div class="resource-profile-helper-meta">
                ${steps.length ? `<span><i class="fas fa-list-ol" aria-hidden="true"></i> ${steps.length} step${steps.length === 1 ? '' : 's'}</span>` : ''}
                ${downloads.length ? `<span><i class="fas fa-download" aria-hidden="true"></i> ${downloads.length} download${downloads.length === 1 ? '' : 's'}</span>` : ''}
              </div>
            `
            : ''
          }
        </div>
        ${resource.cover ? `<img src="${resource.cover}" alt="${resource.title}" class="post-cover" data-viewer="true">` : ''}
      </header>
      ${downloads.length
        ? `
          <section class="resource-profile-block">
            <h2>Quick Downloads</h2>
            <div class="resource-download-list">
              ${downloads.map((item) => `
                <a class="resource-download-link" href="${item.url}" target="_blank" rel="noopener noreferrer">
                  <span>${escapeHtml(item.label)}</span>
                  <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
                </a>
              `).join('')}
            </div>
          </section>
        `
        : ''
      }
      ${steps.length
        ? `
          <section class="resource-profile-block">
            <h2>Step by Step</h2>
            <ol class="resource-step-list">
              ${steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
            </ol>
          </section>
        `
        : ''
      }
      <section class="resource-profile-block resource-profile-body">
        <h2>Reference</h2>
        <div class="post-body">
          ${processedHtml}
        </div>
      </section>
    </article>
  `;

  const tocNav = document.getElementById('toc-nav');
  if (tocNav) {
    tocNav.innerHTML = tocHtml;
  }

  if (breadcrumb && breadcrumbPost) {
    breadcrumbPost.textContent = resource.title;
    breadcrumb.style.display = 'flex';
    const crumb = breadcrumb.querySelector('.breadcrumb-item');
    if (crumb) crumb.textContent = 'Resources';
  }

  if (commentsSection) {
    commentsSection.style.display = 'none';
  }

  if (typeof window.registerViewerImages === 'function') {
    window.registerViewerImages(postContent);
  }
  if (typeof window.setReactionContext === 'function') {
    window.setReactionContext('');
  }

  clearPostNavigation();
  setupTOC();

  if (typeof window.setShareContext === 'function') {
    window.setShareContext({
      title: `Check out "${resource.title}" on Nomu's resources`,
      url: `${window.location.origin}${window.location.pathname}?resource=${resource.slug}`
    });
  } else {
    window.__pendingShareContext = {
      title: `Check out "${resource.title}" on Nomu's resources`,
      url: `${window.location.origin}${window.location.pathname}?resource=${resource.slug}`
    };
  }
}

function showResourcePage(resourceSlug, options = {}) {
  closeProjectAlbumLightbox();
  const resource = getResourceBySlug(resourceSlug);
  if (!resource) return false;

  const pageLoader = document.getElementById('page-loader');
  const heroSection = document.getElementById('hero');
  const blogSection = document.querySelector('.blog-section');
  const singleView = document.getElementById('single-post-view');
  const featuredSection = document.getElementById('featured-section');

  if (pageLoader) {
    pageLoader.classList.remove('hidden');
  }
  if (typeof window.setTopNavActive === 'function') {
    window.setTopNavActive('nav-resources');
  }
  setRailMode('hidden');
  closeRailDrawer();

  setTimeout(() => {
    if (heroSection) heroSection.style.display = 'none';
    if (blogSection) blogSection.style.display = 'none';
    if (singleView) singleView.style.display = 'block';
    if (featuredSection) featuredSection.style.display = 'none';
    renderResourcePage(resourceSlug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (pageLoader) {
      pageLoader.classList.add('hidden');
    }
  }, 260);

  if (options.pushState !== false) {
    history.pushState({ resource: resourceSlug }, '', `?resource=${encodeURIComponent(resourceSlug)}`);
  }
  return true;
}
window.showResourcePage = showResourcePage;

// Show single post view
function showSinglePost(slug, options = {}) {
  closeProjectAlbumLightbox();
  const pageLoader = document.getElementById('page-loader');
  const heroSection = document.getElementById('hero');
  const blogSection = document.querySelector('.blog-section');
  const singleView = document.getElementById('single-post-view');
  const featuredSection = document.getElementById('featured-section');
  
  // Show loading screen
  if (pageLoader) {
    pageLoader.classList.remove('hidden');
  }
  setRailMode('single');
  closeRailDrawer();
  
  setTimeout(() => {
    if (heroSection) heroSection.style.display = 'none';
    blogSection.style.display = 'none';
    singleView.style.display = 'block';
    if (featuredSection) {
      featuredSection.style.display = 'none';
    }
    
    renderSinglePost(slug);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Hide loading screen
    if (pageLoader) {
      pageLoader.classList.add('hidden');
    }
  }, 300);
  
  // Update URL without reloading
  if (options.pushState !== false) {
    history.pushState({ post: slug }, '', `?post=${slug}`);
  }
}

// Hide single post view and show blog list
function hideSinglePost(options = {}) {
  closeProjectAlbumLightbox();
  const pageLoader = document.getElementById('page-loader');
  const heroSection = document.getElementById('hero');
  const blogSection = document.querySelector('.blog-section');
  const singleView = document.getElementById('single-post-view');
  const featuredSection = document.getElementById('featured-section');
  
  // Show loading screen
  if (pageLoader) {
    pageLoader.classList.remove('hidden');
  }
  
  setTimeout(() => {
    setRailMode('hub');
    if (heroSection) heroSection.style.display = 'block';
    if (blogSection) blogSection.style.display = 'block';
    if (singleView) singleView.style.display = 'none';
    if (featuredSection && currentHubView === 'home') {
      featuredSection.style.display = 'grid';
      setupFeaturedPost(sortPosts(allPosts, 'newest')[0] || null);
    }
    
    // Hide TOC sidebar
    const tocSidebar = document.getElementById('toc-sidebar');
    if (tocSidebar) {
      tocSidebar.classList.remove('open');
    }
    closeRailDrawer();
    
    setContentHubView(currentHubView, {
      syncUrl: options.updateUrl !== false,
      replaceState: false,
      suppressNavSync: false,
      showLoader: false
    });
    setLeftRailContext(currentHubView);

    if (typeof window.setShareContext === 'function') {
      window.setShareContext({
        title: document.title,
        url: `${window.location.origin}${window.location.pathname}${window.location.search}`
      });
    }
    
    // Scroll to top
    if (!options.preserveScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Hide loading screen
    if (pageLoader) {
      pageLoader.classList.add('hidden');
    }
  }, 300);
}

// Change page
function changePage(page, options = {}) {
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / postsPerPage));
  const targetPage = Number.parseInt(page, 10);
  if (!Number.isInteger(targetPage)) return;

  const safePage = Math.min(Math.max(1, targetPage), totalPages);
  currentPage = safePage;
  suppressPostsListScroll = Boolean(options.suppressScroll);

  try {
    renderPostsList(filteredPosts, currentPage);
  } finally {
    suppressPostsListScroll = false;
  }

  if (currentHubView === 'posts' && options.updateUrl !== false) {
    updatePostsUrlState({ replace: options.replaceState !== false });
  }
}

function changeProjectPage(page) {
  const items = getFilteredProjects();
  const totalPages = Math.max(1, Math.ceil(items.length / projectsPerPage));
  const targetPage = Number.parseInt(page, 10);
  if (!Number.isInteger(targetPage)) return;
  currentProjectPage = Math.min(Math.max(1, targetPage), totalPages);
  renderProjectsList(items, currentProjectPage);
}

function changeResourcePage(page) {
  const items = getFilteredResources();
  const totalPages = Math.max(1, Math.ceil(items.length / resourcesPerPage));
  const targetPage = Number.parseInt(page, 10);
  if (!Number.isInteger(targetPage)) return;
  currentResourcePage = Math.min(Math.max(1, targetPage), totalPages);
  renderResourcesList(items, currentResourcePage);
}

function goToNextPage() {
  if (currentHubView === 'posts') {
    changePage(currentPage + 1);
    return;
  }
  if (currentHubView === 'projects') {
    changeProjectPage(currentProjectPage + 1);
    return;
  }
  if (currentHubView === 'resources') {
    changeResourcePage(currentResourcePage + 1);
  }
}

function goToPrevPage() {
  if (currentHubView === 'posts') {
    changePage(currentPage - 1);
    return;
  }
  if (currentHubView === 'projects') {
    changeProjectPage(currentProjectPage - 1);
    return;
  }
  if (currentHubView === 'resources') {
    changeResourcePage(currentResourcePage - 1);
  }
}

// Jump to specific page from input
function jumpToPage(pageNum) {
  const page = Number.parseInt(pageNum, 10);
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / postsPerPage));

  if (page >= 1 && page <= totalPages) {
    changePage(page, { replaceState: false });
  }
}

// Filter posts based on category, search query and sort
function filterPosts(options = {}) {
  let posts = allPosts.slice();

  if (currentCategory !== 'all') {
    posts = posts.filter((post) => post.category === currentCategory);
  }

  if (currentSearchQuery) {
    const query = currentSearchQuery.toLowerCase();
    posts = posts.filter((post) => {
      const title = post.title.toLowerCase();
      const excerpt = post.excerpt.toLowerCase();
      const body = post.body.toLowerCase();
      const category = post.category.toLowerCase();

      return title.includes(query) ||
        excerpt.includes(query) ||
        body.includes(query) ||
        category.includes(query);
    });
  }

  posts = sortPosts(posts, currentSort);
  filteredPosts = posts;

  const shouldResetPage = options.resetPage !== false;
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / postsPerPage));
  if (shouldResetPage) {
    currentPage = 1;
  } else {
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
  }

  suppressPostsListScroll = Boolean(options.suppressScroll);
  try {
    renderPostsList(filteredPosts, currentPage);
  } finally {
    suppressPostsListScroll = false;
  }

  updateSearchResults();

  if (currentHubView === 'posts' && options.updateUrl !== false) {
    updatePostsUrlState({ replace: options.replaceState !== false });
  }
}

// Setup search functionality with search results, history, and clear button
function setupSearch() {
  const searchInput = document.getElementById('search-input');
  const searchWrapper = document.getElementById('search-wrapper');
  const searchClearBtn = document.getElementById('search-clear');
  const suggestions = document.getElementById('search-suggestions');

  if (!searchInput || !searchWrapper || !searchClearBtn || !suggestions) {
    console.error('search controls not found');
    return;
  }

  loadSearchHistory();
  searchClearBtn.hidden = true;

  const applySearch = () => {
    if (currentSearchQuery) {
      searchWrapper.classList.add('active');
      searchClearBtn.hidden = false;
      showSearchSuggestions(currentSearchQuery);
    } else {
      searchWrapper.classList.remove('active');
      searchClearBtn.hidden = true;
      suggestions.classList.remove('visible');
    }

    filterPosts({ resetPage: true, replaceState: true });
  };

  const debouncedSearch = typeof debounce === 'function'
    ? debounce(applySearch, 300)
    : applySearch;

  searchInput.addEventListener('input', (event) => {
    currentSearchQuery = event.target.value.trim();
    debouncedSearch();
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    searchWrapper.classList.remove('active');
    searchClearBtn.hidden = true;
    suggestions.classList.remove('visible');
    filterPosts({ resetPage: true, replaceState: true });
  });

  searchInput.addEventListener('focus', () => {
    if (currentSearchQuery) {
      showSearchSuggestions(currentSearchQuery);
    } else if (searchHistory.length > 0) {
      showSearchHistory();
    }
  });

  document.addEventListener('click', (event) => {
    if (!searchWrapper.contains(event.target) && !suggestions.contains(event.target)) {
      suggestions.classList.remove('visible');
    }
  });
}

function bindSuggestionActions(suggestions) {
  suggestions.querySelectorAll('.search-suggestion-item[data-query]').forEach((item) => {
    item.addEventListener('click', () => {
      const query = item.getAttribute('data-query');
      if (query) selectSearchSuggestion(query);
    });
  });
}

// Show search suggestions dropdown
function showSearchSuggestions(query) {
  const suggestions = document.getElementById('search-suggestions');
  const queryLower = query.toLowerCase();

  const matchedPosts = allPosts.filter((post) =>
    post.title.toLowerCase().includes(queryLower) ||
    post.category.toLowerCase().includes(queryLower)
  ).slice(0, 5);

  const matchedHistory = searchHistory.filter((item) =>
    item.toLowerCase().includes(queryLower) && item !== query
  ).slice(0, 3);

  const postMarkup = matchedPosts.map((post) => (
    `<button type="button" class="search-suggestion-item" data-query="${escapeHtml(post.title)}">${escapeHtml(post.title)}</button>`
  )).join('');

  const historyMarkup = matchedHistory.map((item) => (
    `<button type="button" class="search-suggestion-item history" data-query="${escapeHtml(item)}"><i class="fas fa-history" aria-hidden="true"></i>${escapeHtml(item)}</button>`
  )).join('');

  const html = `${postMarkup}${historyMarkup}`;
  if (!html) {
    suggestions.classList.remove('visible');
    return;
  }

  suggestions.innerHTML = html;
  bindSuggestionActions(suggestions);
  suggestions.classList.add('visible');
}

// Show search history dropdown
function showSearchHistory() {
  const suggestions = document.getElementById('search-suggestions');

  if (searchHistory.length === 0) {
    suggestions.classList.remove('visible');
    return;
  }

  suggestions.innerHTML = searchHistory.slice(0, 5).map((item) => (
    `<button type="button" class="search-suggestion-item history" data-query="${escapeHtml(item)}"><i class="fas fa-history" aria-hidden="true"></i>${escapeHtml(item)}</button>`
  )).join('');

  bindSuggestionActions(suggestions);
  suggestions.classList.add('visible');
}

// Select a suggestion
function selectSearchSuggestion(query) {
  const searchInput = document.getElementById('search-input');
  const suggestions = document.getElementById('search-suggestions');
  const searchClearBtn = document.getElementById('search-clear');
  const searchWrapper = document.getElementById('search-wrapper');

  if (!searchInput || !suggestions || !searchClearBtn || !searchWrapper) return;

  searchInput.value = query;
  currentSearchQuery = query;

  searchHistory = searchHistory.filter((item) => item !== query);
  searchHistory.unshift(query);
  saveSearchHistory();

  searchWrapper.classList.add('active');
  searchClearBtn.hidden = false;

  filterPosts({ resetPage: true, replaceState: false });
  suggestions.classList.remove('visible');
}

// Update search results display
function updateSearchResults() {
  const resultsInfo = document.getElementById('search-results-info');
  if (!resultsInfo) return;

  if (currentSearchQuery) {
    const count = filteredPosts.length;
    const text = count === 1 ? 'result' : 'results';
    resultsInfo.innerHTML = `Found <strong>${count}</strong> ${text} for "<strong>${escapeHtml(currentSearchQuery)}</strong>"`;
    resultsInfo.classList.add('visible');
  } else {
    resultsInfo.classList.remove('visible');
    resultsInfo.innerHTML = '';
  }
}

// Setup category filters
function setupFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');

  filterButtons.forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
    btn.addEventListener('click', () => {
      applyCategoryFilter(btn.dataset.category, {
        resetPage: true,
        suppressAutoScroll: false,
        replaceState: false
      });
    });
  });
}

function setupSortControl() {
  const sortSelect = document.getElementById('posts-sort');
  if (!sortSelect) return;
  sortSelect.value = currentSort;
  sortSelect.addEventListener('change', (event) => {
    currentSort = normalizeSort(event.target.value);
    sortSelect.value = currentSort;
    filterPosts({ resetPage: true, replaceState: false });
  });
}

function setupProjectSearch() {
  const input = document.getElementById('projects-search-input');
  const clear = document.getElementById('projects-search-clear');
  if (!input || !clear) return;

  const runSearch = debounce(() => {
    currentProjectSearch = input.value.trim();
    currentProjectPage = 1;
    setupProjectsShowcase({ preview: false });
    if (typeof window.setLeftRailContext === 'function') {
      setLeftRailContext('projects');
    }
    clear.hidden = !currentProjectSearch;
  }, 200);

  input.addEventListener('input', runSearch);
  clear.addEventListener('click', () => {
    input.value = '';
    currentProjectSearch = '';
    currentProjectPage = 1;
    clear.hidden = true;
    setupProjectsShowcase({ preview: false });
  });
}

function setupResourceSearch() {
  const input = document.getElementById('resources-search-input');
  const clear = document.getElementById('resources-search-clear');
  if (!input || !clear) return;

  const runSearch = debounce(() => {
    currentResourceSearch = input.value.trim();
    currentResourcePage = 1;
    setupResourcesShowcase({ preview: false });
    if (typeof window.setLeftRailContext === 'function') {
      setLeftRailContext('resources');
    }
    clear.hidden = !currentResourceSearch;
  }, 200);

  input.addEventListener('input', runSearch);
  clear.addEventListener('click', () => {
    input.value = '';
    currentResourceSearch = '';
    currentResourcePage = 1;
    clear.hidden = true;
    setupResourcesShowcase({ preview: false });
  });
}

function applyCategoryFilter(category = 'all', options = {}) {
  const filterButtons = document.querySelectorAll('.filter-btn');
  if (!filterButtons.length) return;
  const clearSearch = Boolean(options.clearSearch);
  const suppressAutoScroll = Boolean(options.suppressAutoScroll);

  if (clearSearch) {
    currentSearchQuery = '';
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear');
    const searchWrapper = document.getElementById('search-wrapper');
    const suggestions = document.getElementById('search-suggestions');
    const resultsInfo = document.getElementById('search-results-info');
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.hidden = true;
    if (searchWrapper) searchWrapper.classList.remove('active');
    if (suggestions) suggestions.classList.remove('visible');
    if (resultsInfo) {
      resultsInfo.classList.remove('visible');
      resultsInfo.innerHTML = '';
    }
  }

  const normalized = category || 'all';
  const targetButton = document.querySelector(`.filter-btn[data-category="${normalized}"]`) ||
    document.querySelector('.filter-btn[data-category="all"]');

  filterButtons.forEach((btn) => {
    const isActive = btn === targetButton;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  currentCategory = targetButton ? targetButton.dataset.category : 'all';

  const videoSpace = document.getElementById('video-editing-space');
  if (videoSpace) {
    const isVideoCategory = currentCategory === 'Video Editing';
    videoSpace.hidden = !isVideoCategory;
  }

  filterPosts({
    resetPage: options.resetPage !== false,
    suppressScroll: suppressAutoScroll,
    replaceState: options.replaceState,
    updateUrl: options.updateUrl
  });

  if (!suppressAutoScroll && currentHubView === 'posts') {
    const searchBar = document.getElementById('blog-search-bar');
    if (searchBar && typeof window.scrollToElementWithHeaderOffset === 'function') {
      window.scrollToElementWithHeaderOffset(searchBar, 12);
    }
  }

  if (currentHubView === 'posts') {
    setLeftRailContext('posts');
  }
}

function ensureBlogControlsReady() {
  if (blogControlsInitialized) return;
  setupSearch();
  setupFilters();
  setupSortControl();
  setupProjectSearch();
  setupResourceSearch();
  blogControlsInitialized = true;
}

window.applyCategoryFilter = applyCategoryFilter;
window.ensureBlogControlsReady = ensureBlogControlsReady;
window.setContentHubView = setContentHubView;
window.setLeftRailContext = setLeftRailContext;
window.navigatePagination = { next: goToNextPage, prev: goToPrevPage };
window.getGlobalSearchData = () => ({
  posts: allPosts,
  projects: allProjects,
  resources: allResources
});
function setupPostNavigation(slug) {
  const currentIndex = allPosts.findIndex((post) => post.slug === slug);
  const prevPost = currentIndex >= 0 && currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;

  const prevLink = document.getElementById('prev-post');
  const nextLink = document.getElementById('next-post');
  const stickyPrevBtn = document.getElementById('sticky-prev-post');
  const stickyNextBtn = document.getElementById('sticky-next-post');

  if (prevLink) {
    const prevTitle = prevLink.querySelector('.nav-title');
    if (prevPost && prevTitle) {
      prevTitle.textContent = prevPost.title;
      prevLink.style.display = '';
      prevLink.onclick = (e) => {
        e.preventDefault();
        showSinglePost(prevPost.slug);
      };
    } else {
      prevLink.style.display = 'none';
      prevLink.onclick = null;
    }
  }

  if (nextLink) {
    const nextTitle = nextLink.querySelector('.nav-title');
    if (nextPost && nextTitle) {
      nextTitle.textContent = nextPost.title;
      nextLink.style.display = '';
      nextLink.onclick = (e) => {
        e.preventDefault();
        showSinglePost(nextPost.slug);
      };
    } else {
      nextLink.style.display = 'none';
      nextLink.onclick = null;
    }
  }

  if (stickyPrevBtn) {
    stickyPrevBtn.disabled = !prevPost;
    stickyPrevBtn.setAttribute(
      'aria-label',
      prevPost ? `Previous post: ${prevPost.title}` : 'Previous post unavailable'
    );
    stickyPrevBtn.title = prevPost ? prevPost.title : 'No previous post';
    stickyPrevBtn.onclick = prevPost ? () => showSinglePost(prevPost.slug) : null;
  }

  if (stickyNextBtn) {
    stickyNextBtn.disabled = !nextPost;
    stickyNextBtn.setAttribute(
      'aria-label',
      nextPost ? `Next post: ${nextPost.title}` : 'Next post unavailable'
    );
    stickyNextBtn.title = nextPost ? nextPost.title : 'No next post';
    stickyNextBtn.onclick = nextPost ? () => showSinglePost(nextPost.slug) : null;
  }
}

// Render single post view
async function renderSinglePost(slug) {
  const post = allPosts.find(p => p.slug === slug);
  
  if (!post) {
    document.getElementById('post-content').innerHTML = '<p>Post not found.</p>';
    return;
  }
  
  // Parse markdown to HTML
  const htmlContent = parseMarkdown(post.body);
  
  // Add IDs to headings for TOC navigation
  const processedHtml = addHeadingIds(htmlContent);
  
  // Count headings
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = processedHtml;
  const headingCount = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
  
  // Generate TOC from processed HTML (with IDs)
  const tocHtml = generateTOCFromProcessed(processedHtml);
  
  // Render breadcrumb
  const breadcrumb = document.getElementById('breadcrumb');
  const breadcrumbPost = document.getElementById('breadcrumb-post');
  if (breadcrumb && breadcrumbPost) {
    breadcrumbPost.textContent = post.title;
    breadcrumb.style.display = 'flex';
    const crumb = breadcrumb.querySelector('.breadcrumb-item');
    if (crumb) crumb.textContent = 'Posts';
  }
  
  // Render post header and body
  const postContent = document.getElementById('post-content');
  postContent.innerHTML = `
    <div class="post-header">
      <div class="post-header-content">
        <h1>${post.title}</h1>
        <div class="post-meta">
          <span>${formatDate(post.date)}</span>
          <span>â€¢</span>
          <span>${formatCategory(post.category)}</span>
          <span>â€¢</span>
          <span>${post.readTime} min read</span>
        </div>
        ${post.excerpt ? `<p class="post-excerpt">${post.excerpt}</p>` : ''}
      </div>
      <img src="${post.cover}" alt="${post.title}" class="post-cover" data-viewer="true" onerror="this.style.display='none'">
    </div>
    <div class="post-body">
      ${processedHtml}
    </div>
  `;
  
  // Make headers clickable
  const postBody = document.querySelector('.post-body');
  if (postBody) {
    postBody.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      if (heading.id) {
        heading.style.cursor = 'pointer';
        heading.addEventListener('click', () => {
          smoothScrollTo(heading.id);
        });
      }
    });
  }
  
  // Render TOC
  const tocNav = document.getElementById('toc-nav');
  if (tocNav) {
    tocNav.innerHTML = tocHtml;
  }
  
  // Setup prev/next navigation
  setupPostNavigation(slug);
  
  // Setup share buttons
  setupShareButtons(post);
  
  // Setup back to top button
  setupBackToTop();

  // Setup TOC toggle functionality
  setupTOC();

  if (typeof window.registerViewerImages === 'function') {
    window.registerViewerImages(postContent);
  }
  if (typeof window.setReactionContext === 'function') {
    window.setReactionContext(post.slug);
  }
  
  // Highlight code blocks
  if (typeof hljs !== 'undefined') {
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
  }
  
  // Load and setup comments
  const commentsSection = document.getElementById('comments-section');
  if (commentsSection) {
    commentsSection.style.display = 'block';
  }
  setupCommentForm(slug);
}

// Setup TOC toggle functionality
function setupTOC() {
  const tocToggle = document.getElementById('toc-toggle');
  const tocSidebar = document.getElementById('toc-sidebar');
  const tocClose = document.getElementById('toc-close');
  
  if (tocToggle) {
    if (tocSidebar) {
      // We're on a single post page with TOC
      tocToggle.style.display = 'block';
      
      // Toggle TOC on both mobile and desktop
      tocToggle.addEventListener('click', () => {
        tocSidebar.classList.toggle('open');
      });
      
      // Close TOC when clicking close button
      if (tocClose) {
        tocClose.addEventListener('click', () => {
          tocSidebar.classList.remove('open');
        });
      }
      
      // Close TOC when clicking outside (only on mobile or when TOC is open)
      document.addEventListener('click', (e) => {
        if (!tocSidebar.contains(e.target) && 
            !tocToggle.contains(e.target) &&
            tocSidebar.classList.contains('open')) {
          tocSidebar.classList.remove('open');
        }
      });
    } else {
      // We're not on a single post page, hide TOC button
      tocToggle.style.display = 'none';
    }
  }
}

// Add IDs to headings for TOC navigation
function addHeadingIds(htmlContent) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headingCounts = {};
  
  headings.forEach(heading => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent.trim();
    const baseId = text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Handle duplicate IDs
    let id = baseId;
    let counter = 1;
    while (headingCounts[id]) {
      id = `${baseId}-${counter}`;
      counter++;
    }
    headingCounts[id] = true;
    
    heading.id = id;
    console.log(`Added ID "${id}" to heading: ${text}`);
  });
  
  return tempDiv.innerHTML;
}

// Generate Table of Contents from processed HTML (with IDs already added)
function generateTOCFromProcessed(htmlContent) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Only include h1 and h2 headings
  const headings = tempDiv.querySelectorAll('h1, h2');
  if (headings.length === 0) {
    return '<p class="toc-empty">No sections found</p>';
  }
  
  // Create a simple hierarchical list
  let tocHtml = '<div class="toc-list">';
  let currentLevel = 1;
  let openLists = [1]; // Track open list levels
  
  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent.trim();
    const id = heading.id;
    
    // Close lists for higher levels
    while (openLists.length > 0 && openLists[openLists.length - 1] >= level) {
      tocHtml += '</div>';
      openLists.pop();
    }
    
    // Open new list if needed
    if (level > currentLevel) {
      tocHtml += '<div class="toc-sublist">';
      openLists.push(level);
    }
    
    currentLevel = level;
    
    // Add the list item
    tocHtml += `<div class="toc-item toc-level-${level}">
      <a href="javascript:void(0);" class="toc-link" onclick="smoothScrollTo('${id}'); return false;">${text}</a>
    </div>`;
  });
  
  // Close any remaining open lists
  while (openLists.length > 1) {
    tocHtml += '</div>';
    openLists.pop();
  }
  
  tocHtml += '</div>';
  return tocHtml;
}

// Smooth scroll to element
function smoothScrollTo(id) {
  console.log(`Attempting to scroll to element with id: "${id}"`);
  const element = document.getElementById(id);
  if (element) {
    console.log(`Found element, scrolling to:`, element);
    // Get the element's position relative to the viewport
    const elementRect = element.getBoundingClientRect();
    const absoluteElementTop = elementRect.top + window.pageYOffset;
    
    // Account for any fixed headers (adjust offset as needed)
    const offset = 20; // Small offset from top
    const targetPosition = absoluteElementTop - offset;
    
    // Smooth scroll to the target position
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
    
    // Close mobile TOC after clicking
    if (window.innerWidth <= 768) {
    const tocSidebar = document.getElementById('toc-sidebar');
    if (tocSidebar) {
      tocSidebar.classList.remove('open');
    }
    closeRailDrawer();
    }
  } else {
    console.warn(`Element with id "${id}" not found`);
  }
}

// Setup comment form
function setupCommentForm(postSlug) {
  if (typeof initializeComments === 'function') {
    initializeComments(postSlug);
  } else {
    console.warn('Comments system not loaded.');
  }

  if (typeof refreshComments === 'function') {
    refreshComments(postSlug);
  }
}

// Load and display comments
function loadComments(postSlug) {
  if (typeof refreshComments === 'function') {
    refreshComments(postSlug);
  }
}

// Setup share buttons
function setupShareButtons(post) {
  const postUrl = `${window.location.origin}${window.location.pathname}?post=${post.slug}`;
  const postTitle = `Check out "${post.title}" on Nomu's blog`;
  const shareContext = { title: postTitle, url: postUrl };

  if (typeof window.setShareContext === 'function') {
    window.setShareContext(shareContext);
  } else {
    window.__pendingShareContext = shareContext;
  }
}

// Setup back to top button
function setupBackToTop() {
  const backToTopBtn = document.getElementById('back-to-top');
  
  if (!backToTopBtn) return;
  
  // Show/hide button on scroll
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  });
  
  // Scroll to top on click
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// Setup back to posts functionality
function setupBackToPosts() {
  const backLink = document.getElementById('back-to-posts');
  
  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      hideSinglePost();
    });
  }
}

function syncPostsStateFromUrl() {
  currentCategory = tagToCategory(getQueryParam('tag'));
  currentSort = normalizeSort(getQueryParam('sort') || currentSort);
  const pageFromUrl = Number.parseInt(getQueryParam('page') || '1', 10);
  currentPage = Number.isInteger(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1;
}

function renderHubRoute(view, options = {}) {
  const requestedView = normalizeHubView(view || 'home');

  if (requestedView === 'posts') {
    ensureBlogControlsReady();
    syncPostsStateFromUrl();
    const sortSelect = document.getElementById('posts-sort');
    if (sortSelect) sortSelect.value = currentSort;
    setContentHubView('posts', {
      syncUrl: options.syncUrl,
      replaceState: options.replaceState,
      scrollToSection: options.scrollToSection,
      suppressNavSync: options.suppressNavSync
    });
    applyCategoryFilter(currentCategory, {
      clearSearch: options.clearSearch !== false,
      suppressAutoScroll: true,
      resetPage: false,
      updateUrl: options.syncUrl,
      replaceState: options.replaceState
    });
    return;
  }

  setContentHubView(requestedView, {
    syncUrl: options.syncUrl,
    replaceState: options.replaceState,
    scrollToSection: options.scrollToSection,
    suppressNavSync: options.suppressNavSync
  });
}

// Initialize page
async function initPage(postSlug, projectId = null, resourceSlug = null) {
  console.log('initPage called with postSlug:', postSlug, 'projectId:', projectId, 'resourceSlug:', resourceSlug);

  const pageLoader = document.getElementById('page-loader');
  if (pageLoader) {
    pageLoader.classList.remove('hidden');
  }

  // Bolt ⚡ Optimization: Load all content types in parallel
  await Promise.all([
    loadPosts(),
    loadResources(),
    loadProjects()
  ]);

  setupHubActions();
  renderPostsPreview();
  setupProjectsShowcase({ preview: true });
  setupResourcesShowcase({ preview: true });
  setupToolsPreview();
  setupGamesShowcase();
  ensureLeftRailEvents();

  setupBackToPosts();
  setupTOC();
  setupBackToTop();

  const heroSection = document.getElementById('hero');
  const blogSection = document.querySelector('.blog-section');
  const singleView = document.getElementById('single-post-view');
  const requestedView = normalizeHubView(getQueryParam('view') || 'home');

  if (projectId || resourceSlug || postSlug) {
    currentHubView = normalizeHubView(getQueryParam('view') || (projectId ? 'projects' : (resourceSlug ? 'resources' : 'posts')));
  }

  if (projectId) {
    if (heroSection) heroSection.style.display = 'none';
    if (blogSection) blogSection.style.display = 'none';
    if (singleView) singleView.style.display = 'block';
    const openedProject = showProjectShowcase(projectId, { pushState: false });
    if (!openedProject) {
      if (heroSection) heroSection.style.display = 'block';
      if (blogSection) blogSection.style.display = 'block';
      if (singleView) singleView.style.display = 'none';
      renderHubRoute(requestedView, { syncUrl: false, replaceState: true, clearSearch: true });
    }
  } else if (resourceSlug) {
    if (heroSection) heroSection.style.display = 'none';
    if (blogSection) blogSection.style.display = 'none';
    if (singleView) singleView.style.display = 'block';
    const openedResource = showResourcePage(resourceSlug, { pushState: false });
    if (!openedResource) {
      if (heroSection) heroSection.style.display = 'block';
      if (blogSection) blogSection.style.display = 'block';
      if (singleView) singleView.style.display = 'none';
      renderHubRoute('resources', { syncUrl: false, replaceState: true, clearSearch: true });
    }
  } else if (postSlug) {
    if (heroSection) heroSection.style.display = 'none';
    if (blogSection) blogSection.style.display = 'none';
    if (singleView) singleView.style.display = 'block';
    showSinglePost(postSlug, { pushState: false });
  } else {
    setRailMode('hub');
    if (heroSection) heroSection.style.display = 'block';
    if (blogSection) blogSection.style.display = 'block';
    if (singleView) singleView.style.display = 'none';
    renderHubRoute(requestedView, { syncUrl: false, replaceState: true, clearSearch: true });
  }

  setTimeout(() => {
    if (pageLoader) {
      pageLoader.classList.add('hidden');
    }
  }, 320);

  window.addEventListener('popstate', () => {
    const newPostSlug = getQueryParam('post');
    const newProjectId = getQueryParam('project');
    const newResourceSlug = getQueryParam('resource');
    const routeView = normalizeHubView(getQueryParam('view') || 'home');

    if (newProjectId) {
      currentHubView = 'projects';
      const openedProject = showProjectShowcase(newProjectId, { pushState: false });
      if (!openedProject) {
        renderHubRoute('projects', { syncUrl: false, replaceState: true, clearSearch: true });
      }
      return;
    }

    if (newResourceSlug) {
      currentHubView = 'resources';
      const openedResource = showResourcePage(newResourceSlug, { pushState: false });
      if (!openedResource) {
        renderHubRoute('resources', { syncUrl: false, replaceState: true, clearSearch: true });
      }
      return;
    }

    if (newPostSlug) {
      currentHubView = 'posts';
      showSinglePost(newPostSlug, { pushState: false });
      return;
    }

    const toolsDashboard = document.getElementById('tools-dashboard');
    const featuredSection = document.getElementById('featured-section');
    const contactSection = document.querySelector('.contact');
    if (toolsDashboard) toolsDashboard.style.display = 'none';
    setRailMode('hub');
    if (blogSection) blogSection.style.display = 'block';
    if (singleView) singleView.style.display = 'none';
    if (contactSection) contactSection.style.display = 'block';
    if (featuredSection && routeView !== 'home') featuredSection.style.display = 'none';

    renderHubRoute(routeView, { syncUrl: false, replaceState: true, clearSearch: true });
  });
}
