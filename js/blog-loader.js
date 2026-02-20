// blog-loader.js - Blog Loader & Logic
// NO MODULE EXPORTS - Using global scope for compatibility
// Requires: utils.js, markdown-parser.js to be loaded first

// Manifest of all blog posts (fallback if posts/index.json is missing)
const DEFAULT_POST_MANIFEST = [
  'Markdowntest.md',
  'NomuSite.md',
  'MAIV1.md',
  'SUpdate1.md',
  'Pornban.md',
  'SUpdate2.md',
  'SUpdate3.md',
  'SUpdate4.md',
  'PlanChina.md',
];

let POST_MANIFEST = DEFAULT_POST_MANIFEST.slice();
let manifestLoaded = false;


let allPosts = [];
let filteredPosts = [];
let currentCategory = 'all';
let currentSearchQuery = '';
let currentPage = 1;
let searchHistory = [];
let activeSuggestionIndex = -1;
let searchBound = false;
let filtersBound = false;
let currentPostSlug = '';
let currentInfoView = '';
let keyboardNavBound = false;
const postsPerPage = 4;

// Load search history from localStorage
function loadSearchHistory() {
  const saved = localStorage.getItem('searchHistory');
  if (!saved) {
    searchHistory = [];
    return;
  }
  try {
    searchHistory = JSON.parse(saved) || [];
  } catch (error) {
    console.warn('Failed to parse search history, resetting.', error);
    searchHistory = [];
    localStorage.removeItem('searchHistory');
  }
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

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(text || '').replace(/[&<>"']/g, (char) => map[char]);
}

function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (/^(https?:|\/|\.\/|\.\.\/|assets\/)/i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

const DEFAULT_PAGE_META = {
  title: document.title,
  description: (document.querySelector('meta[name="description"]') || {}).content || '',
  ogTitle: (document.querySelector('meta[property="og:title"]') || {}).content || '',
  ogDescription: (document.querySelector('meta[property="og:description"]') || {}).content || '',
  ogImage: (document.querySelector('meta[property="og:image"]') || {}).content || '',
  twitterTitle: (document.querySelector('meta[name="twitter:title"]') || {}).content || '',
  twitterDescription: (document.querySelector('meta[name="twitter:description"]') || {}).content || '',
  twitterImage: (document.querySelector('meta[name="twitter:image"]') || {}).content || ''
};

function resolveSiteBasePath() {
  const path = window.location.pathname || '/';
  const postIndex = path.indexOf('/post/');
  if (postIndex >= 0) {
    return path.slice(0, postIndex + 1);
  }

  const fileSegment = path.endsWith('/') ? path : path.slice(0, path.lastIndexOf('/') + 1);
  return fileSegment || '/';
}

function buildAbsoluteUrl(relativePath) {
  const basePath = resolveSiteBasePath();
  const cleaned = String(relativePath || '').replace(/^\//, '');
  return `${window.location.origin}${basePath}${cleaned}`;
}

function buildPostPermalink(slug) {
  return buildAbsoluteUrl(`post/${encodeURIComponent(slug)}/`);
}

function resolveAbsoluteAssetUrl(value) {
  const input = String(value || '').trim();
  if (!input) return buildAbsoluteUrl('assets/Peak.png');
  if (/^https?:\/\//i.test(input)) return input;
  if (input.startsWith('/')) return `${window.location.origin}${input}`;
  return buildAbsoluteUrl(input);
}

function updatePageMeta(title, description) {
  if (title) {
    document.title = title;
  }
  const meta = document.querySelector('meta[name="description"]');
  if (meta && description) {
    meta.setAttribute('content', description);
  }
}

function setMetaValue(selector, value) {
  const el = document.querySelector(selector);
  if (!el || !value) return;
  el.setAttribute('content', value);
}

function updateCanonical(url) {
  const canonical = document.querySelector('#canonical-url');
  if (!canonical || !url) return;
  canonical.setAttribute('href', url);
}

function updateSocialMeta(post) {
  if (!post) return;
  const title = `${post.title} | Nomu's Blog`;
  const description = post.excerpt || DEFAULT_PAGE_META.description;
  const image = resolveAbsoluteAssetUrl(post.cover);
  const url = buildPostPermalink(post.slug);

  setMetaValue('meta[property="og:title"]', title);
  setMetaValue('meta[property="og:description"]', description);
  setMetaValue('meta[property="og:image"]', image);
  setMetaValue('meta[property="og:url"]', url);
  setMetaValue('meta[name="twitter:title"]', title);
  setMetaValue('meta[name="twitter:description"]', description);
  setMetaValue('meta[name="twitter:image"]', image);
  updateCanonical(url);
}

function restorePageMeta() {
  updatePageMeta(DEFAULT_PAGE_META.title, DEFAULT_PAGE_META.description);
  setMetaValue('meta[property="og:title"]', DEFAULT_PAGE_META.ogTitle || DEFAULT_PAGE_META.title);
  setMetaValue('meta[property="og:description"]', DEFAULT_PAGE_META.ogDescription || DEFAULT_PAGE_META.description);
  setMetaValue('meta[property="og:image"]', DEFAULT_PAGE_META.ogImage || buildAbsoluteUrl('assets/Peak.png'));
  setMetaValue('meta[property="og:url"]', buildAbsoluteUrl('index.html'));
  setMetaValue('meta[name="twitter:title"]', DEFAULT_PAGE_META.twitterTitle || DEFAULT_PAGE_META.title);
  setMetaValue('meta[name="twitter:description"]', DEFAULT_PAGE_META.twitterDescription || DEFAULT_PAGE_META.description);
  setMetaValue('meta[name="twitter:image"]', DEFAULT_PAGE_META.twitterImage || buildAbsoluteUrl('assets/Peak.png'));
  updateCanonical(buildAbsoluteUrl('index.html'));
}

const infoSectionState = new Map();
const ROUTE_NAMES = new Set(['home', 'blog', 'now', 'uses', 'setup', 'tools', 'post']);
const TOOL_NAMES = new Set(['hub', 'gpa', 'password', 'pomodoro']);

let activeInfoSection = null;
let routerBound = false;
let routeLinksBound = false;
let paginationBound = false;
let pendingRouteOptions = null;
let currentMainView = 'home';

function normalizeRouteName(value) {
  const candidate = String(value || '').trim().toLowerCase();
  return ROUTE_NAMES.has(candidate) ? candidate : '';
}

function sanitizeToolName(value) {
  const candidate = String(value || '').trim().toLowerCase();
  if (!candidate) return 'hub';
  return TOOL_NAMES.has(candidate) ? candidate : 'hub';
}

function parseHashRoute(hashValue = window.location.hash) {
  const cleaned = String(hashValue || '').replace(/^#/, '').replace(/^\/+/, '').trim();
  if (!cleaned) return { view: 'home' };

  const [headRaw, ...restRaw] = cleaned.split('/');
  const head = String(headRaw || '').toLowerCase();
  const rest = restRaw.map((part) => decodeURIComponent(part));

  if (head === 'posts') {
    return { view: 'blog' };
  }
  if (head === 'blog' || head === 'home' || head === 'now' || head === 'uses' || head === 'setup') {
    return { view: head };
  }
  if (head === 'tools') {
    return { view: 'tools', tool: sanitizeToolName(rest[0]) };
  }
  if (head === 'post') {
    const slug = rest.join('/').trim();
    return { view: 'post', slug };
  }
  return { view: 'home' };
}

function buildHashForRoute(route) {
  const view = normalizeRouteName(route && route.view) || 'home';
  if (view === 'post') {
    const slug = String(route && route.slug || '').trim();
    return slug ? `#post/${encodeURIComponent(slug)}` : '#blog';
  }
  if (view === 'tools') {
    const tool = sanitizeToolName(route && route.tool);
    return tool === 'hub' ? '#tools' : `#tools/${tool}`;
  }
  return `#${view}`;
}

function getScrollBehavior(options = {}) {
  if (options.initial) return 'auto';
  if (options.scrollBehavior) return options.scrollBehavior;
  return 'smooth';
}

function scrollPageTop(behavior = 'auto') {
  window.scrollTo({ top: 0, behavior });
}

function scrollToElementStart(targetId, behavior = 'smooth') {
  const target = document.getElementById(targetId);
  if (!target) {
    scrollPageTop(behavior);
    return;
  }
  const rootStyles = getComputedStyle(document.documentElement);
  const headerOffset = Number.parseInt(rootStyles.getPropertyValue('--header-offset'), 10) || 0;
  const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 8;
  window.scrollTo({ top: Math.max(0, top), behavior });
}

function hideTopPostNav() {
  const prevLink = document.getElementById('prev-post');
  const nextLink = document.getElementById('next-post');
  if (prevLink) prevLink.style.display = 'none';
  if (nextLink) nextLink.style.display = 'none';
}

function setActiveNav(view) {
  const normalized = normalizeRouteName(view) || 'home';
  document.querySelectorAll('.nav-link').forEach((link) => {
    const route = normalizeRouteName(link.dataset.route || link.dataset.view);
    const isHomeLink = link.id === 'logo-link' || route === 'home';
    const isActive = normalized === 'home' ? isHomeLink : route === normalized;
    link.classList.toggle('active', isActive);
  });
}

function setMainView(view) {
  const heroSection = document.getElementById('hero');
  const nowSection = document.getElementById('now-status');
  const blogSection = document.querySelector('.blog-section');
  const featuredSection = document.getElementById('featured-section');
  const detailsSection = document.getElementById('details');
  const contactSection = document.querySelector('.contact');
  const singleView = document.getElementById('single-post-view');
  const infoView = document.getElementById('info-view');

  const showHome = view === 'home';
  const showBlog = view === 'blog';
  const showPost = view === 'post';
  const showInfo = view === 'info';

  if (heroSection) heroSection.style.display = showHome ? 'block' : 'none';
  if (nowSection) nowSection.style.display = showHome ? 'block' : 'none';
  if (blogSection) blogSection.style.display = showBlog ? 'block' : 'none';
  if (featuredSection) featuredSection.style.display = (showHome || showBlog) ? 'grid' : 'none';
  if (detailsSection) detailsSection.style.display = 'none';
  if (contactSection) contactSection.style.display = (showHome || showBlog) ? 'block' : 'none';
  if (singleView) singleView.style.display = showPost ? 'block' : 'none';
  if (infoView) infoView.style.display = showInfo ? 'block' : 'none';

  document.body.classList.toggle('post-view', showPost);
  document.body.classList.toggle('info-view', showInfo);
  document.body.classList.toggle('list-view', !showPost && !showInfo);

  currentMainView = view;
  setupTOC();
}

function storeSectionPosition(section) {
  if (!section || infoSectionState.has(section)) return;
  infoSectionState.set(section, {
    parent: section.parentElement,
    next: section.nextElementSibling
  });
}

function moveSection(section, target) {
  if (!section || !target) return;
  storeSectionPosition(section);
  target.innerHTML = '';
  target.appendChild(section);
}

function restoreSection(section) {
  if (!section) return;
  const state = infoSectionState.get(section);
  if (!state || !state.parent) return;
  if (state.next && state.parent.contains(state.next)) {
    state.parent.insertBefore(section, state.next);
  } else {
    state.parent.appendChild(section);
  }
}

function activateToolView(viewId) {
  const toolsSection = document.getElementById('tools-section');
  if (!toolsSection) return;
  const target = sanitizeToolName(viewId);
  toolsSection.querySelectorAll('[data-tool-view]').forEach((section) => {
    section.classList.toggle('hidden', section.dataset.toolView !== target);
  });
  toolsSection.querySelectorAll('.tools-nav-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.toolTarget === target);
  });
}

function setupToolsView() {
  const toolsSection = document.getElementById('tools-section');
  if (!toolsSection || toolsSection.dataset.bound === 'true') return;

  toolsSection.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tool-target]');
    if (!button || !toolsSection.contains(button)) return;
    event.preventDefault();
    const target = sanitizeToolName(button.dataset.toolTarget);
    activateToolView(target);
    if (currentInfoView === 'tools') {
      navigateToRoute({ view: 'tools', tool: target }, {
        keepScroll: true,
        scrollBehavior: 'auto'
      });
    }
  });

  toolsSection.dataset.bound = 'true';
}

function showInfoView(view, toolView, options = {}) {
  const infoView = document.getElementById('info-view');
  const infoContent = document.getElementById('info-content');
  const infoTitle = document.getElementById('info-sticky-title');
  const infoBreadcrumb = document.getElementById('info-breadcrumb');
  const infoBreadcrumbLabel = document.getElementById('info-breadcrumb-label');
  const infoStickyHeader = document.getElementById('info-sticky-header');

  if (!infoView || !infoContent) return;

  const labelMap = {
    now: 'Now',
    uses: 'Uses',
    setup: 'Setup',
    tools: 'Toolbox'
  };

  const sourceMap = {
    now: document.getElementById('now-details'),
    uses: document.getElementById('uses-details'),
    setup: document.getElementById('setup-details'),
    tools: document.getElementById('tools-section')
  };

  const source = sourceMap[view];
  if (!source) return;

  if (activeInfoSection && activeInfoSection !== source) {
    if (activeInfoSection.id === 'tools-section') {
      activeInfoSection.style.display = 'none';
    }
    restoreSection(activeInfoSection);
  }
  activeInfoSection = source;

  setMainView('info');
  resetPostChrome();
  currentInfoView = view;
  currentPostSlug = '';

  moveSection(source, infoContent);
  source.style.display = 'block';

  hideTopPostNav();

  if (infoTitle) infoTitle.textContent = labelMap[view] || 'Info';
  if (infoBreadcrumbLabel) infoBreadcrumbLabel.textContent = labelMap[view] || 'Info';
  if (infoBreadcrumb) infoBreadcrumb.style.display = 'flex';
  if (infoStickyHeader) infoStickyHeader.setAttribute('aria-hidden', 'false');

  if (view === 'tools') {
    setupToolsView();
    activateToolView(toolView || 'hub');
  }

  setActiveNav(view);
  restorePageMeta();

  if (!options.keepScroll) {
    scrollPageTop(options.scrollBehavior || 'auto');
  }
}

function hideInfoView() {
  const infoContent = document.getElementById('info-content');
  const infoStickyHeader = document.getElementById('info-sticky-header');
  const infoBreadcrumb = document.getElementById('info-breadcrumb');

  if (activeInfoSection) {
    if (activeInfoSection.id === 'tools-section') {
      activeInfoSection.style.display = 'none';
    }
    restoreSection(activeInfoSection);
  }
  activeInfoSection = null;

  if (infoContent) {
    infoContent.innerHTML = '';
  }
  if (infoStickyHeader) infoStickyHeader.setAttribute('aria-hidden', 'true');
  if (infoBreadcrumb) infoBreadcrumb.style.display = 'none';
  currentInfoView = '';
}

function showBlogListView(scrollTarget, options = {}) {
  hideInfoView();
  resetPostChrome();
  currentPostSlug = '';
  setMainView('blog');
  setActiveNav('blog');
  restorePageMeta();

  if (scrollTarget) {
    scrollToElementStart(scrollTarget, options.scrollBehavior || 'smooth');
    return;
  }
  if (!options.keepScroll) {
    scrollPageTop(options.scrollBehavior || 'auto');
  }
}

function openHomeView(options = {}) {
  hideInfoView();
  resetPostChrome();
  currentPostSlug = '';
  setMainView('home');
  setActiveNav('home');
  restorePageMeta();

  if (!options.keepScroll) {
    scrollPageTop(options.scrollBehavior || 'auto');
  }
}

async function openPostView(slug, options = {}) {
  if (!slug) {
    showBlogListView('posts', { keepScroll: false, scrollBehavior: options.scrollBehavior || 'auto' });
    return;
  }
  const postExists = allPosts.some((post) => post.slug === slug);
  if (!postExists) {
    showBlogListView('posts', { keepScroll: false, scrollBehavior: options.scrollBehavior || 'auto' });
    return;
  }

  hideInfoView();
  setMainView('post');
  setActiveNav('blog');
  currentPostSlug = slug;
  await renderSinglePost(slug);

  if (!options.keepScroll) {
    scrollPageTop(options.scrollBehavior || 'auto');
  }
}

async function applyRoute(route, options = {}) {
  const resolved = route || { view: 'home' };
  const view = normalizeRouteName(resolved.view) || 'home';
  const behavior = getScrollBehavior(options);

  if (view === 'post') {
    await openPostView(resolved.slug, {
      keepScroll: options.keepScroll,
      scrollBehavior: behavior
    });
    return;
  }

  if (view === 'blog') {
    showBlogListView(options.scrollTarget || '', {
      keepScroll: options.keepScroll,
      scrollBehavior: behavior
    });
    return;
  }

  if (view === 'now' || view === 'uses' || view === 'setup' || view === 'tools') {
    showInfoView(view, resolved.tool, {
      keepScroll: options.keepScroll,
      scrollBehavior: behavior
    });
    return;
  }

  openHomeView({
    keepScroll: options.keepScroll,
    scrollBehavior: behavior
  });
}

function handleHashChange() {
  const options = pendingRouteOptions || {};
  pendingRouteOptions = null;
  const route = parseHashRoute(window.location.hash);
  Promise.resolve(applyRoute(route, options)).catch((error) => {
    console.error('Failed to apply route:', error);
  });
}

function navigateToRoute(route, options = {}) {
  const hash = buildHashForRoute(route);
  const currentHash = window.location.hash || '';

  if (currentHash === hash) {
    Promise.resolve(applyRoute(parseHashRoute(hash), {
      keepScroll: options.keepScroll,
      scrollTarget: options.scrollTarget || '',
      scrollBehavior: options.scrollBehavior || 'smooth'
    })).catch((error) => {
      console.error('Failed to apply route:', error);
    });
    return;
  }

  pendingRouteOptions = {
    keepScroll: options.keepScroll,
    scrollTarget: options.scrollTarget || '',
    scrollBehavior: options.scrollBehavior || 'smooth'
  };

  if (options.replace) {
    history.replaceState({}, '', `${window.location.pathname}${hash}`);
    handleHashChange();
    return;
  }

  window.location.hash = hash;
}

function setupHashRouter() {
  if (routerBound) return;
  window.addEventListener('hashchange', handleHashChange);
  routerBound = true;
}

function setupInfoLinks() {
  if (routeLinksBound) return;

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const routeTrigger = event.target.closest('[data-route]');
    if (!routeTrigger) return;

    const route = normalizeRouteName(routeTrigger.dataset.route);
    if (!route) return;

    if (routeTrigger.tagName.toLowerCase() === 'a' || routeTrigger.tagName.toLowerCase() === 'button') {
      event.preventDefault();
    }

    if (route === 'post') {
      const slug = routeTrigger.dataset.slug || '';
      if (slug) {
        navigateToRoute({ view: 'post', slug });
      }
      return;
    }

    if (route === 'blog') {
      const scrollTarget = routeTrigger.dataset.scrollTarget || '';
      navigateToRoute({ view: 'blog' }, {
        keepScroll: false,
        scrollTarget: scrollTarget || 'posts'
      });
      return;
    }

    if (route === 'tools') {
      navigateToRoute({ view: 'tools', tool: routeTrigger.dataset.tool || '' }, {
        keepScroll: false
      });
      return;
    }

    navigateToRoute({ view: route }, {
      keepScroll: false
    });
  });

  routeLinksBound = true;
}

function resolveInitialRoute() {
  if (window.location.hash && window.location.hash.length > 1) {
    return parseHashRoute(window.location.hash);
  }

  const postParam = getQueryParam('post');
  if (postParam) {
    return { view: 'post', slug: postParam };
  }

  const viewParam = normalizeRouteName(getQueryParam('view'));
  if (viewParam === 'tools') {
    return { view: 'tools', tool: sanitizeToolName(getQueryParam('tool')) };
  }
  if (viewParam) {
    return { view: viewParam };
  }

  return { view: 'home' };
}

window.navigateToView = function navigateToView(view, options = {}) {
  const normalized = normalizeRouteName(view) || 'home';
  if (normalized === 'post') {
    navigateToRoute({ view: 'post', slug: options.slug || '' }, options);
    return;
  }
  if (normalized === 'tools') {
    navigateToRoute({ view: 'tools', tool: options.tool || '' }, options);
    return;
  }
  navigateToRoute({ view: normalized }, options);
};

async function loadPostManifest() {
  if (manifestLoaded) return POST_MANIFEST;
  manifestLoaded = true;
  try {
    const response = await fetch('./posts/index.json', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.posts) && data.posts.length > 0) {
        POST_MANIFEST = data.posts;
        return POST_MANIFEST;
      }
    }
  } catch (error) {
    console.warn('Failed to load posts/index.json, using fallback manifest.', error);
  }
  POST_MANIFEST = DEFAULT_POST_MANIFEST.slice();
  return POST_MANIFEST;
}

// Load all posts from markdown files
async function loadPosts() {
  if (allPosts.length > 0) {
    return allPosts;
  }
  
  const posts = [];
  const manifest = await loadPostManifest();
  
  for (const filename of manifest) {
    try {
      console.log(`Attempting to load: posts/${filename}`);
      const response = await fetch(`./posts/${filename}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const content = await response.text();
      console.log(`Loaded ${filename}, length: ${content.length}`);
      
      const { frontmatter, body } = parseFrontmatter(content);
      console.log(`Parsed frontmatter:`, frontmatter);
      
      // Derive slug from filename if not in frontmatter
      const slug = frontmatter.slug || filename.replace('.md', '');

      // Calculate reading time
      const readTime = frontmatter.readTime || calculateReadingTime(body);

      const tags = typeof parseTags === 'function' ? parseTags(frontmatter.tags) : [];
      const series = frontmatter.series ? String(frontmatter.series).trim() : '';
      const seriesPart = Number.parseInt(frontmatter.part, 10);
      const seriesTotal = Number.parseInt(frontmatter.total, 10);
      const author = frontmatter.author ? String(frontmatter.author).trim() : '';
      
      // Construct post object
      const resolvedCover = sanitizeUrl(frontmatter.cover) || `assets/images/${slug}.png`;
      const post = {
        slug,
        title: frontmatter.title || 'Untitled',
        date: frontmatter.date || new Date().toISOString().split('T')[0],
        category: frontmatter.category || 'uncategorized',
        excerpt: frontmatter.excerpt || generateExcerpt(body),
        cover: resolvedCover,
        readTime,
        tags,
        series,
        part: Number.isFinite(seriesPart) ? seriesPart : null,
        total: Number.isFinite(seriesTotal) ? seriesTotal : null,
        author,
        body,
        filename
      };
      
      posts.push(post);
      console.log(`Successfully loaded post:`, post.title);
    } catch (error) {
      console.error(`Error loading post ${filename}:`, error);
    }
  }
  
  // Sort by date (newest first)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  console.log(`Total posts loaded: ${posts.length}`);
  
  allPosts = posts;
  filteredPosts = posts;
  return posts;
}

function renderListEmptyState() {
  const queryText = currentSearchQuery ? ` for "${escapeHtml(currentSearchQuery)}"` : '';
  const categoryText = currentCategory !== 'all' ? ` in ${escapeHtml(formatCategory(currentCategory))}` : '';
  const hint = currentSearchQuery || currentCategory !== 'all'
    ? 'Try clearing the current filter or search query.'
    : 'New posts will appear here when published.';
  const clearButton = currentSearchQuery || currentCategory !== 'all'
    ? '<button type="button" class="btn btn-compact empty-reset-btn" id="empty-reset-btn">Clear filters</button>'
    : '';

  return `
    <div class="empty-state-card" role="status" aria-live="polite">
      <h3>No posts found${queryText}${categoryText}</h3>
      <p>${hint}</p>
      ${clearButton}
    </div>
  `;
}

// Render post cards in list view with pagination
function renderPostsList(posts, page = 1) {
  const container = document.getElementById('posts-list');
  
  if (!container) {
    console.error('posts-list container not found');
    return;
  }
  
  if (posts.length === 0) {
    container.classList.add('posts-few');
    container.innerHTML = renderListEmptyState();
    const resetButton = document.getElementById('empty-reset-btn');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        currentSearchQuery = '';
        currentCategory = 'all';
        const searchInput = document.getElementById('search-input');
        const searchClear = document.getElementById('search-clear');
        if (searchInput) searchInput.value = '';
        if (searchClear) searchClear.style.display = 'none';
        document.querySelectorAll('.filter-btn').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.category === 'all');
        });
        filterPosts();
        updateSearchResults();
      });
    }
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(posts.length / postsPerPage);
  const startIndex = (page - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const postsToShow = posts.slice(startIndex, endIndex);
  container.classList.toggle('posts-few', postsToShow.length < 2);
  
  container.innerHTML = postsToShow.map((post, index) => {
    const coverUrl = encodeURI(sanitizeUrl(post.cover) || 'assets/Peak.png').replace(/\"/g, '%22');
    const safeTitle = escapeHtml(post.title);
    const safeExcerpt = escapeHtml(post.excerpt);
    const safeCategory = escapeHtml(formatCategory(post.category));
    const safeSlug = escapeHtml(post.slug);
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const tagsHtml = tags.length
      ? `<div class="post-tags">${tags.map(tag => `<span class="post-tag">${escapeHtml(tag)}</span>`).join('')}</div>`
      : '';
    return `
      <article class="post-card" data-slug="${safeSlug}" style="background-image: url(&quot;${coverUrl}&quot;); animation-delay: ${index * 0.05}s;">
        <div class="post-card-content">
          <div class="post-meta">
            <span>${formatDate(post.date)}</span>
            <span aria-hidden="true">&middot;</span>
            <span>${safeCategory}</span>
            <span aria-hidden="true">&middot;</span>
            <span>${post.readTime} min read</span>
          </div>
          <h3><a href="#" class="post-link" data-slug="${safeSlug}">${safeTitle}</a></h3>
          <p class="post-excerpt">${safeExcerpt}</p>
          ${tagsHtml}
          <a href="#" class="read-more post-link" data-slug="${safeSlug}">Read post &rarr;</a>
        </div>
        <img src="${coverUrl}" alt="${safeTitle}" class="post-thumb" loading="lazy" decoding="async" onerror="this.style.display='none'">
      </article>
    `;
  }).join('');

  bindPostCardClicks();
  
  // Setup featured post (only on first page)
  if (allPosts.length > 0 && page === 1) {
    setupFeaturedPost(allPosts[0]);
  }
  
  // Render pagination
  renderPagination(totalPages, page);
  
  // Keep position stable on initial load; no auto-scroll here
}

function bindPostCardClicks() {
  const container = document.getElementById('posts-list');
  if (!container || container.dataset.bound === 'true') return;
  container.addEventListener('click', (e) => {
    const target = e.target.closest('[data-slug]');
    if (!target || !container.contains(target)) return;
    e.preventDefault();
    const slug = target.dataset.slug;
    if (slug) {
      showSinglePost(slug);
    }
  });
  container.dataset.bound = 'true';
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

function buildPaginationSequence(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let startPage = Math.max(2, currentPage - 1);
  let endPage = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 3) {
    startPage = 2;
    endPage = 4;
  } else if (currentPage >= totalPages - 2) {
    startPage = totalPages - 3;
    endPage = totalPages - 1;
  }

  const sequence = [1];
  if (startPage > 2) {
    sequence.push('ellipsis-left');
  }

  for (let page = startPage; page <= endPage; page += 1) {
    sequence.push(page);
  }

  if (endPage < totalPages - 1) {
    sequence.push('ellipsis-right');
  }
  sequence.push(totalPages);

  return sequence;
}

function bindPaginationControls() {
  const paginationContainer = document.getElementById('pagination');
  if (!paginationContainer || paginationBound) return;

  paginationContainer.addEventListener('click', (event) => {
    const pageButton = event.target.closest('button[data-page]');
    if (pageButton && paginationContainer.contains(pageButton)) {
      const targetPage = Number.parseInt(pageButton.dataset.page, 10);
      if (Number.isFinite(targetPage)) {
        changePage(targetPage);
      }
      return;
    }

    const jumpButton = event.target.closest('button[data-page-jump]');
    if (!jumpButton || !paginationContainer.contains(jumpButton)) return;
    const pageInput = document.getElementById('page-input');
    if (pageInput) {
      jumpToPage(pageInput.value);
    }
  });

  paginationContainer.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const trigger = event.target.closest('button[data-page], button[data-page-jump]');
    if (!trigger || !paginationContainer.contains(trigger)) return;
    event.preventDefault();
    trigger.click();
  });

  paginationContainer.addEventListener('keydown', (event) => {
    if (event.target.id !== 'page-input' || event.key !== 'Enter') return;
    event.preventDefault();
    jumpToPage(event.target.value);
  });

  paginationBound = true;
}

// Render pagination controls
function renderPagination(totalPages, currentPage) {
  const paginationContainer = document.getElementById('pagination');

  if (!paginationContainer) {
    console.error('pagination container not found');
    return;
  }

  bindPaginationControls();

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  const digitCount = String(totalPages).length;
  const pageBtnWidth = Math.max(2.6, digitCount + 0.8);
  const previousDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  let paginationHTML = `<div class="pagination-controls" style="--page-btn-width: ${pageBtnWidth}ch">`;

  paginationHTML += `
    <button
      type="button"
      class="pagination-btn pagination-nav"
      ${previousDisabled ? 'disabled aria-disabled="true"' : `data-page="${currentPage - 1}"`}
      aria-label="Go to previous page"
      title="Previous page"
    >
      <i class="fas fa-chevron-left" aria-hidden="true"></i>
      <span class="sr-only">Previous page</span>
    </button>
  `;

  paginationHTML += '<div class="pagination-pages" aria-label="Pagination pages">';
  const pageSequence = buildPaginationSequence(totalPages, currentPage);

  pageSequence.forEach((entry) => {
    if (typeof entry === 'string') {
      paginationHTML += '<span class="pagination-ellipsis" aria-hidden="true">...</span>';
      return;
    }

    const isActive = entry === currentPage;
    const activeClass = isActive ? ' active' : '';
    const activeState = isActive ? ' aria-current="page"' : '';
    paginationHTML += `
      <button
        type="button"
        class="pagination-btn page-number${activeClass}"
        data-page="${entry}"
        aria-label="Go to page ${entry}"${activeState}
      >${entry}</button>
    `;
  });
  paginationHTML += '</div>';

  paginationHTML += `
    <button
      type="button"
      class="pagination-btn pagination-nav"
      ${nextDisabled ? 'disabled aria-disabled="true"' : `data-page="${currentPage + 1}"`}
      aria-label="Go to next page"
      title="Next page"
    >
      <span class="sr-only">Next page</span>
      <i class="fas fa-chevron-right" aria-hidden="true"></i>
    </button>
  `;

  paginationHTML += `
    <div class="page-jump">
      <i class="fas fa-hashtag" aria-hidden="true"></i>
      <label for="page-input" class="sr-only">Go to page</label>
      <input type="number" id="page-input" min="1" max="${totalPages}" value="${currentPage}" inputmode="numeric">
      <button type="button" class="pagination-btn pagination-jump-btn" data-page-jump aria-label="Jump to page">
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
        <span class="sr-only">Jump</span>
      </button>
      <span class="page-total">/ ${totalPages}</span>
    </div>
  `;

  paginationHTML += '</div>';
  paginationContainer.innerHTML = paginationHTML;
}

function resetPostChrome() {
  const stickyHeader = document.getElementById('post-sticky-header');
  const breadcrumb = document.getElementById('breadcrumb');
  const tocSidebar = document.getElementById('toc-sidebar');
  if (stickyHeader) {
    stickyHeader.setAttribute('aria-hidden', 'true');
  }
  if (breadcrumb) {
    breadcrumb.style.display = 'none';
  }
  if (tocSidebar) {
    tocSidebar.classList.remove('open');
    tocSidebar.setAttribute('aria-hidden', 'true');
  }
  hideTopPostNav();
}

// Show single post view
function showSinglePost(slug, options = {}) {
  if (!slug) return;
  if (options.fromRoute) {
    return openPostView(slug, options);
  }

  navigateToRoute({ view: 'post', slug }, {
    replace: options.replace,
    keepScroll: options.keepScroll,
    scrollBehavior: options.scrollBehavior || 'smooth'
  });
}

// Hide single post view and show blog list
function hideSinglePost(options = {}) {
  resetPostChrome();
  currentPostSlug = '';

  if (options.fromRoute) {
    showBlogListView(options.scrollTarget || '', {
      keepScroll: options.keepScroll,
      scrollBehavior: options.scrollBehavior || 'smooth'
    });
    return;
  }

  navigateToRoute({ view: 'blog' }, {
    replace: options.replace,
    keepScroll: options.keepScroll,
    scrollTarget: options.scrollTarget || '',
    scrollBehavior: options.scrollBehavior || 'smooth'
  });
}

// Change page
function changePage(page) {
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  if (page < 1 || page > totalPages || page === currentPage) {
    return;
  }

  currentPage = page;
  renderPostsList(filteredPosts, currentPage);
  
  // Update page input if it exists
  const pageInput = document.getElementById('page-input');
  if (pageInput) {
    pageInput.value = page;
  }
}

// Jump to specific page from input
function jumpToPage(pageNum) {
  const page = Number.parseInt(pageNum, 10);
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  
  if (!Number.isNaN(page) && page >= 1 && page <= totalPages) {
    changePage(page);
  } else {
    // Reset to current page if invalid
    const pageInput = document.getElementById('page-input');
    if (pageInput) {
      pageInput.value = currentPage;
    }
  }
}

// Filter posts based on category and search query (with full-text search)
function filterPosts() {
  let posts = allPosts;
  
  // Filter by category
  if (currentCategory !== 'all') {
    posts = posts.filter(post => post.category === currentCategory);
  }
  
  // Filter by search query (full-text search)
  if (currentSearchQuery) {
    const query = currentSearchQuery.toLowerCase();
    posts = posts.filter(post => {
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
  
  filteredPosts = posts;
  currentPage = 1; // Reset to first page when filtering
  renderPostsList(posts, currentPage);
}

function setSuggestionsVisibility(isVisible, input) {
  const suggestions = document.getElementById('search-suggestions');
  if (!suggestions) return;
  suggestions.classList.toggle('visible', isVisible);
  suggestions.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
  if (input) {
    input.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
  }
}

function resetActiveSuggestion(input) {
  activeSuggestionIndex = -1;
  if (input) {
    input.removeAttribute('aria-activedescendant');
  }
  const suggestions = document.getElementById('search-suggestions');
  if (!suggestions) return;
  suggestions.querySelectorAll('.search-suggestion-item').forEach((item) => {
    item.setAttribute('aria-selected', 'false');
    item.classList.remove('active');
  });
}

function updateActiveSuggestion(input) {
  const suggestions = document.getElementById('search-suggestions');
  if (!suggestions) return;
  const items = Array.from(suggestions.querySelectorAll('.search-suggestion-item'));
  items.forEach((item, index) => {
    const id = `search-suggestion-${index}`;
    item.id = id;
    const isActive = index === activeSuggestionIndex;
    item.setAttribute('aria-selected', isActive ? 'true' : 'false');
    item.classList.toggle('active', isActive);
  });
  if (input) {
    if (activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
      input.setAttribute('aria-activedescendant', items[activeSuggestionIndex].id);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }
}

// Setup search functionality with search results, history, and clear button
function setupSearch() {
  const searchInput = document.getElementById('search-input');
  const searchWrapper = document.getElementById('search-wrapper');
  const searchClearBtn = document.getElementById('search-clear');
  const resultsInfo = document.getElementById('search-results-info');
  const suggestions = document.getElementById('search-suggestions');
  
  if (!searchInput) {
    console.error('search-input not found');
    return;
  }
  if (searchBound || searchInput.dataset.bound === 'true') {
    return;
  }
  
  loadSearchHistory();
  
  // Input handler for search
  searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim();
    
    if (currentSearchQuery) {
      searchWrapper.classList.add('active');
      searchClearBtn.style.display = 'block';
      showSearchSuggestions(currentSearchQuery);
    } else {
      searchWrapper.classList.remove('active');
      searchClearBtn.style.display = 'none';
      setSuggestionsVisibility(false, searchInput);
      resetActiveSuggestion(searchInput);
    }
    
    filterPosts();
    updateSearchResults();
  });
  
  // Clear button handler
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    searchWrapper.classList.remove('active');
    searchClearBtn.style.display = 'none';
    setSuggestionsVisibility(false, searchInput);
    resetActiveSuggestion(searchInput);
    filterPosts();
    updateSearchResults();
  });
  
  // Prevent closing suggestions on input click
  searchInput.addEventListener('focus', () => {
    if (currentSearchQuery) {
      showSearchSuggestions(currentSearchQuery);
    } else if (searchHistory.length > 0) {
      showSearchHistory();
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    const items = Array.from(suggestions.querySelectorAll('.search-suggestion-item'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!items.length) {
        if (currentSearchQuery) {
          showSearchSuggestions(currentSearchQuery);
        } else {
          showSearchHistory();
        }
        return;
      }
      activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
      updateActiveSuggestion(searchInput);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
      updateActiveSuggestion(searchInput);
      return;
    }
    if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
        e.preventDefault();
        items[activeSuggestionIndex].click();
      }
      return;
    }
    if (e.key === 'Escape') {
      setSuggestionsVisibility(false, searchInput);
      resetActiveSuggestion(searchInput);
    }
  });
  
  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchWrapper.contains(e.target) && !suggestions.contains(e.target)) {
      setSuggestionsVisibility(false, searchInput);
      resetActiveSuggestion(searchInput);
    }
  });

  searchInput.dataset.bound = 'true';
  searchBound = true;
}

// Show search suggestions dropdown
function showSearchSuggestions(query) {
  const suggestions = document.getElementById('search-suggestions');
  if (!suggestions) return;
  const searchInput = document.getElementById('search-input');
  resetActiveSuggestion(searchInput);
  const query_lower = query.toLowerCase();
  
  // Get unique suggestions from posts and history
  const matchedPosts = allPosts.filter(post =>
    post.title.toLowerCase().includes(query_lower) ||
    post.category.toLowerCase().includes(query_lower)
  ).slice(0, 5);
  
  const matchedHistory = searchHistory.filter(h =>
    h.toLowerCase().includes(query_lower) && h !== query
  ).slice(0, 3);
  
  const items = [];
  matchedPosts.forEach(post => {
    items.push({ label: post.title, query: post.title, isHistory: false });
  });
  matchedHistory.forEach(item => {
    items.push({ label: item, query: item, isHistory: true });
  });

  renderSearchSuggestions(items);
}

// Show search history dropdown
function showSearchHistory() {
  const suggestions = document.getElementById('search-suggestions');
  if (!suggestions) return;
  const searchInput = document.getElementById('search-input');
  resetActiveSuggestion(searchInput);
  
  if (searchHistory.length === 0) {
    setSuggestionsVisibility(false, searchInput);
    return;
  }
  
  const items = searchHistory.slice(0, 5).map(item => ({
    label: item,
    query: item,
    isHistory: true
  }));
  renderSearchSuggestions(items);
}

function renderSearchSuggestions(items) {
  const suggestions = document.getElementById('search-suggestions');
  if (!suggestions) return;
  const searchInput = document.getElementById('search-input');

  suggestions.innerHTML = '';

  items.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-suggestion-item';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', 'false');
    button.setAttribute('tabindex', '-1');
    button.dataset.query = item.query;
    if (item.isHistory) {
      const icon = document.createElement('i');
      icon.className = 'fas fa-history';
      icon.setAttribute('aria-hidden', 'true');
      button.appendChild(icon);
      button.appendChild(document.createTextNode(` ${item.label}`));
      button.style.opacity = '0.7';
    } else {
      button.textContent = item.label;
    }
    button.addEventListener('click', () => selectSearchSuggestion(item.query));
    suggestions.appendChild(button);
  });

  if (items.length > 0) {
    setSuggestionsVisibility(true, searchInput);
  } else {
    setSuggestionsVisibility(false, searchInput);
  }
  updateActiveSuggestion(searchInput);
}

// Select a suggestion
function selectSearchSuggestion(query) {
  const searchInput = document.getElementById('search-input');
  searchInput.value = query;
  currentSearchQuery = query;
  
  // Add to history
  searchHistory = searchHistory.filter(h => h !== query);
  searchHistory.unshift(query);
  saveSearchHistory();
  
  filterPosts();
  updateSearchResults();
  const suggestions = document.getElementById('search-suggestions');
  if (suggestions) {
    setSuggestionsVisibility(false, searchInput);
    resetActiveSuggestion(searchInput);
  }
  searchInput.focus();
}

// Update search results display
function updateSearchResults() {
  const resultsInfo = document.getElementById('search-results-info');
  
  if (currentSearchQuery) {
    const count = filteredPosts.length;
    const text = count === 1 ? 'result' : 'results';
    resultsInfo.textContent = `Found ${count} ${text} for "${currentSearchQuery}"`;
    resultsInfo.classList.add('visible');
  } else {
    resultsInfo.classList.remove('visible');
    resultsInfo.innerHTML = '';
  }
}

// Setup category filters
function setupFilters() {
  const filterContainer = document.querySelector('.category-filters');
  const filterButtons = document.querySelectorAll('.filter-btn');
  if (!filterContainer || filtersBound || filterContainer.dataset.bound === 'true') return;
  
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update current category
      currentCategory = btn.dataset.category;
      
      // Filter posts
      filterPosts();
      
      // Scroll to search bar area immediately and consistently
      const searchBar = document.querySelector('.search-bar');
      if (searchBar) {
        searchBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
  filterContainer.dataset.bound = 'true';
  filtersBound = true;
}

function buildSeriesBlock(post) {
  if (!post || !post.series) return '';
  const seriesPosts = allPosts
    .filter((candidate) => candidate.series && candidate.series === post.series)
    .sort((a, b) => {
      if (Number.isFinite(a.part) && Number.isFinite(b.part)) {
        return a.part - b.part;
      }
      return new Date(a.date) - new Date(b.date);
    });

  if (seriesPosts.length === 0) return '';

  const activeIndex = seriesPosts.findIndex((item) => item.slug === post.slug);
  const previousPart = activeIndex > 0 ? seriesPosts[activeIndex - 1] : null;
  const nextPart = activeIndex >= 0 && activeIndex < seriesPosts.length - 1 ? seriesPosts[activeIndex + 1] : null;
  const fallbackPart = Number.isFinite(post.part) ? post.part : (activeIndex >= 0 ? activeIndex + 1 : 1);
  const total = Number.isFinite(post.total) ? post.total : seriesPosts.length;

  const navLinks = `
    <div class="series-nav-links">
      ${previousPart ? `<a href="#" class="post-jump-link series-nav-link" data-slug="${escapeHtml(previousPart.slug)}">&larr; ${escapeHtml(previousPart.title)}</a>` : '<span class="series-nav-link muted">Start of series</span>'}
      ${nextPart ? `<a href="#" class="post-jump-link series-nav-link" data-slug="${escapeHtml(nextPart.slug)}">${escapeHtml(nextPart.title)} &rarr;</a>` : '<span class="series-nav-link muted">End of series</span>'}
    </div>
  `;

  const listItems = seriesPosts.map((item) => {
    const isActive = item.slug === post.slug;
    const labelPart = Number.isFinite(item.part) ? `Part ${item.part}` : 'Part';
    return `
      <a href="#" class="post-jump-link series-link${isActive ? ' active' : ''}" data-slug="${escapeHtml(item.slug)}">
        <span>${labelPart}</span>
        <strong>${escapeHtml(item.title)}</strong>
      </a>
    `;
  }).join('');

  return `
    <section class="series-nav" aria-label="Series navigation">
      <p class="series-heading">${escapeHtml(post.series)} <span>Part ${fallbackPart} of ${total}</span></p>
      ${navLinks}
      <div class="series-list">${listItems}</div>
    </section>
  `;
}

function buildRelatedPostsBlock(post) {
  if (!post) return '';
  const currentTags = Array.isArray(post.tags) ? post.tags : [];

  const scored = allPosts
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => {
      const candidateTags = Array.isArray(candidate.tags) ? candidate.tags : [];
      const sharedTags = candidateTags.filter((tag) => currentTags.includes(tag)).length;
      const sameCategory = candidate.category === post.category ? 1 : 0;
      const score = (sameCategory * 3) + (sharedTags * 2);
      return { candidate, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.candidate.date) - new Date(a.candidate.date);
    });

  const primary = scored.filter((entry) => entry.score > 0).slice(0, 3);
  const fallbackNeeded = 3 - primary.length;
  const fallback = fallbackNeeded > 0
    ? scored.filter((entry) => entry.score === 0).slice(0, fallbackNeeded)
    : [];

  const relatedPosts = primary.concat(fallback).map((entry) => entry.candidate);
  if (relatedPosts.length === 0) return '';

  const cards = relatedPosts.map((item) => `
    <article class="related-card">
      <p class="related-meta">${escapeHtml(formatCategory(item.category))} &middot; ${item.readTime} min</p>
      <h4><a href="#" class="post-jump-link" data-slug="${escapeHtml(item.slug)}">${escapeHtml(item.title)}</a></h4>
      <p>${escapeHtml(item.excerpt || '')}</p>
    </article>
  `).join('');

  return `
    <section class="related-posts" aria-label="Related posts">
      <h3>Related posts</h3>
      <div class="related-grid">
        ${cards}
      </div>
    </section>
  `;
}

function bindPostJumpLinks() {
  const container = document.getElementById('single-post-view');
  if (!container) return;
  const links = container.querySelectorAll('.post-jump-link');
  links.forEach((link) => {
    if (link.dataset.bound === 'true') return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const slug = link.dataset.slug;
      if (slug) {
        showSinglePost(slug);
      }
    });
    link.dataset.bound = 'true';
  });
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
  }
  
  // Render post header and body
  const postContent = document.getElementById('post-content');
  const safeTitle = escapeHtml(post.title);
  const safeExcerpt = escapeHtml(post.excerpt);
  const safeCategory = escapeHtml(formatCategory(post.category));
  const coverUrl = encodeURI(sanitizeUrl(post.cover) || 'assets/Peak.png');
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const tagsHtml = tags.length
    ? `<div class="post-tags">${tags.map(tag => `<span class="post-tag">${escapeHtml(tag)}</span>`).join('')}</div>`
    : '';
  const seriesBlock = buildSeriesBlock(post);
  const relatedPostsBlock = buildRelatedPostsBlock(post);
  postContent.innerHTML = `
    <div class="post-header">
      <div class="post-header-content">
        <h1>${safeTitle}</h1>
        <div class="post-meta">
          <span>${formatDate(post.date)}</span>
          <span aria-hidden="true">&middot;</span>
          <span>${safeCategory}</span>
          <span aria-hidden="true">&middot;</span>
          <span>${post.readTime} min read</span>
        </div>
        ${tagsHtml}
        ${post.excerpt ? `<p class="post-excerpt">${safeExcerpt}</p>` : ''}
      </div>
      <img src="${coverUrl}" alt="${safeTitle}" class="post-cover" loading="lazy" decoding="async" onerror="this.style.display='none'">
    </div>
    <div class="post-body">
      ${processedHtml}
    </div>
    ${seriesBlock}
    ${relatedPostsBlock}
  `;

  updatePageMeta(`${post.title} | Nomu's Blog`, post.excerpt || DEFAULT_PAGE_META.description);
  updateSocialMeta(post);
  currentPostSlug = post.slug;

  const stickyHeader = document.getElementById('post-sticky-header');
  const stickyTitle = document.getElementById('post-sticky-title');
  if (stickyHeader && stickyTitle) {
    stickyTitle.textContent = post.title;
    stickyHeader.setAttribute('aria-hidden', 'false');
  }
  
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

  // Setup reactions
  setupReactions(post);

  // Bind series links
  bindPostJumpLinks();
  
  // Setup back to top button
  setupBackToTop();
  
  // Setup TOC toggle functionality
  setupTOC();

  // Setup image zoom viewer for post images
  setupImageViewerForPost();
  
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
  setupCommentForm(slug, post.title);
}

// Setup TOC toggle functionality
function setupTOC() {
  const tocToggle = document.getElementById('toc-toggle');
  const tocSidebar = document.getElementById('toc-sidebar');
  const tocClose = document.getElementById('toc-close');
  const singleView = document.getElementById('single-post-view');

  if (!tocSidebar) return;

  const shouldShow = singleView && singleView.style.display !== 'none';
  const tocRail = tocSidebar.closest('.side-rail-left');
  if (tocRail) {
    tocRail.style.display = shouldShow ? 'flex' : 'none';
  }
  tocSidebar.style.display = shouldShow ? 'block' : 'none';
  if (!shouldShow) {
    tocSidebar.classList.remove('open');
    tocSidebar.setAttribute('aria-hidden', 'true');
  } else {
    tocSidebar.classList.add('open');
    tocSidebar.setAttribute('aria-hidden', 'false');
  }

  if (!tocToggle) return;

  const isWide = window.matchMedia('(min-width: 1024px)').matches;
  tocToggle.style.display = shouldShow && !isWide ? 'block' : 'none';
  tocToggle.setAttribute('aria-hidden', shouldShow && !isWide ? 'false' : 'true');

  if (tocToggle.dataset.bound === 'true') return;
  tocToggle.dataset.bound = 'true';

  // Toggle TOC on both mobile and desktop
  tocToggle.addEventListener('click', () => {
    if (isWide) return;
    const isOpen = tocSidebar.classList.toggle('open');
    tocSidebar.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    tocToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close TOC when clicking close button
  if (tocClose) {
    tocClose.addEventListener('click', () => {
      if (isWide) return;
      tocSidebar.classList.remove('open');
      tocSidebar.setAttribute('aria-hidden', 'true');
      tocToggle.setAttribute('aria-expanded', 'false');
    });
  }

  // Close TOC when clicking outside (only on mobile or when TOC is open)
  document.addEventListener('click', (e) => {
    if (isWide) return;
    if (!tocSidebar.contains(e.target) &&
        !tocToggle.contains(e.target) &&
        tocSidebar.classList.contains('open')) {
      tocSidebar.classList.remove('open');
      tocSidebar.setAttribute('aria-hidden', 'true');
      tocToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// Setup image viewer for post images
let imageViewerInitialized = false;
let openImageViewerFn = null;
let imageViewerGlobalBound = false;

function setupImageViewerForPost() {
  const postBody = document.querySelector('.post-body');
  if (!postBody) return;

  const viewer = ensureImageViewer();
  if (!viewer) return;

  const images = postBody.querySelectorAll('img');
  images.forEach((img) => {
    if (img.dataset.zoomableBound === 'true') return;
    img.dataset.zoomableBound = 'true';
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof openImageViewerFn === 'function') {
        openImageViewerFn(img.src, img.alt || '');
      }
    });
  });
}

function setupImageViewerGlobal() {
  if (imageViewerGlobalBound) return;
  imageViewerGlobalBound = true;

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target) return;
    const img = target.closest('.post-body img, .post-header img');
    if (!img) return;

    const viewer = ensureImageViewer();
    if (!viewer) return;

    e.preventDefault();
    e.stopPropagation();

    if (typeof openImageViewerFn === 'function') {
      openImageViewerFn(img.src, img.alt || '');
    }
  });
}

function ensureImageViewer() {
  const viewer = document.getElementById('image-viewer');
  if (!viewer) {
    console.warn('Image viewer container not found.');
    return null;
  }

  if (imageViewerInitialized) return viewer;
  imageViewerInitialized = true;

  const stage = document.getElementById('image-viewer-stage');
  const img = document.getElementById('image-viewer-img');
  const closeBtn = document.getElementById('image-viewer-close');
  const zoomInBtn = document.getElementById('image-zoom-in');
  const zoomOutBtn = document.getElementById('image-zoom-out');
  const zoomResetBtn = document.getElementById('image-zoom-reset');

  if (!stage || !img || !closeBtn || !zoomInBtn || !zoomOutBtn || !zoomResetBtn) {
    console.warn('Image viewer controls missing.');
    return viewer;
  }

  const state = {
    scale: 1,
    minScale: 1,
    maxScale: 5,
    translateX: 0,
    translateY: 0,
    isPanning: false,
    startX: 0,
    startY: 0,
    startTranslateX: 0,
    startTranslateY: 0
  };

  function applyTransform() {
    img.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
  }

  function clampScale(value) {
    return Math.min(state.maxScale, Math.max(state.minScale, value));
  }

  function resetView() {
    state.scale = 1;
    state.translateX = 0;
    state.translateY = 0;
    applyTransform();
  }

  function openViewer(src, alt) {
    img.src = src;
    img.alt = alt || '';
    resetView();
    viewer.classList.add('open');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('image-viewer-open');
  }

  function closeViewer() {
    viewer.classList.remove('open');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('image-viewer-open');
  }

  function zoomBy(factor) {
    state.scale = clampScale(state.scale * factor);
    applyTransform();
  }

  // Expose to local/global scope for other functions
  openImageViewerFn = openViewer;
  window.openImageViewer = openViewer;

  // Close when clicking outside the image
  viewer.addEventListener('click', (e) => {
    if (e.target === viewer) {
      closeViewer();
    }
  });

  closeBtn.addEventListener('click', closeViewer);
  zoomInBtn.addEventListener('click', () => zoomBy(1.2));
  zoomOutBtn.addEventListener('click', () => zoomBy(0.85));
  zoomResetBtn.addEventListener('click', resetView);

  // Wheel zoom
  stage.addEventListener('wheel', (e) => {
    if (!viewer.classList.contains('open')) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomBy(factor);
  }, { passive: false });

  // Drag to pan
  stage.addEventListener('pointerdown', (e) => {
    if (!viewer.classList.contains('open')) return;
    state.isPanning = true;
    stage.classList.add('grabbing');
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startTranslateX = state.translateX;
    state.startTranslateY = state.translateY;
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', (e) => {
    if (!state.isPanning) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    state.translateX = state.startTranslateX + dx;
    state.translateY = state.startTranslateY + dy;
    applyTransform();
  });

  stage.addEventListener('pointerup', (e) => {
    state.isPanning = false;
    stage.classList.remove('grabbing');
    stage.releasePointerCapture(e.pointerId);
  });

  stage.addEventListener('pointercancel', (e) => {
    state.isPanning = false;
    stage.classList.remove('grabbing');
    stage.releasePointerCapture(e.pointerId);
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && viewer.classList.contains('open')) {
      closeViewer();
    }
  });

  return viewer;
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
    }
  } else {
    console.warn(`Element with id "${id}" not found`);
  }
}

// Setup comment form
function setupCommentForm(postSlug, postTitle) {
  if (typeof initializeComments === 'function') {
    initializeComments(postSlug, postTitle);
  } else {
    console.warn('Comments system not loaded.');
  }
}

function setupPostNavigation(slug) {
  const prevLink = document.getElementById('prev-post');
  const nextLink = document.getElementById('next-post');
  if (!prevLink || !nextLink) return;
  currentPostSlug = slug;

  const currentIndex = allPosts.findIndex(post => post.slug === slug);
  if (currentIndex === -1) {
    prevLink.style.display = 'none';
    nextLink.style.display = 'none';
    return;
  }

  const prevPost = allPosts[currentIndex + 1];
  const nextPost = allPosts[currentIndex - 1];

  const applyNav = (linkEl, post) => {
    if (!post) {
      linkEl.style.display = 'none';
      linkEl.onclick = null;
      linkEl.removeAttribute('title');
      linkEl.removeAttribute('aria-label');
      return;
    }
    const titleEl = linkEl.querySelector('.nav-title');
    if (titleEl) {
      titleEl.textContent = post.title;
    }
    linkEl.setAttribute('title', post.title);
    const direction = linkEl.id === 'prev-post' ? 'previous' : 'next';
    linkEl.setAttribute('aria-label', `Open ${direction} post: ${post.title}`);
    linkEl.style.display = 'inline-grid';
    linkEl.onclick = (e) => {
      e.preventDefault();
      showSinglePost(post.slug);
    };
  };

  applyNav(prevLink, prevPost);
  applyNav(nextLink, nextPost);
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName ? target.tagName.toLowerCase() : '';
  if (target.isContentEditable) return true;
  return tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button';
}

function setupKeyboardPostNavigation() {
  if (keyboardNavBound) return;
  keyboardNavBound = true;

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (isTypingTarget(event.target)) return;
    if (!document.body.classList.contains('post-view') || !currentPostSlug) return;

    const currentIndex = allPosts.findIndex((post) => post.slug === currentPostSlug);
    if (currentIndex === -1) return;

    if (event.key === 'ArrowLeft') {
      const prevPost = allPosts[currentIndex + 1];
      if (!prevPost) return;
      event.preventDefault();
      showSinglePost(prevPost.slug);
    } else if (event.key === 'ArrowRight') {
      const nextPost = allPosts[currentIndex - 1];
      if (!nextPost) return;
      event.preventDefault();
      showSinglePost(nextPost.slug);
    }
  });
}

// Load and display comments
function loadComments(postSlug) {
  if (typeof refreshComments === 'function') {
    refreshComments(postSlug);
  }
}

function getReactionState(slug) {
  const countsKey = `reactions_${slug}`;
  const mineKey = `reactions_${slug}_mine`;
  let counts = {};
  let mine = [];
  try {
    counts = JSON.parse(localStorage.getItem(countsKey) || '{}');
  } catch (e) {
    counts = {};
  }
  try {
    mine = JSON.parse(localStorage.getItem(mineKey) || '[]');
  } catch (e) {
    mine = [];
  }
  const normalized = {
    like: 0,
    fire: 0,
    idea: 0,
    ...counts
  };
  return { counts: normalized, mine: Array.isArray(mine) ? mine : [] };
}

function saveReactionState(slug, state) {
  localStorage.setItem(`reactions_${slug}`, JSON.stringify(state.counts));
  localStorage.setItem(`reactions_${slug}_mine`, JSON.stringify(state.mine));
}

function renderReactions(slug) {
  const container = document.getElementById('reactions');
  if (!container) return;
  const { counts, mine } = getReactionState(slug);
  container.querySelectorAll('.reaction-btn').forEach((btn) => {
    const key = btn.dataset.reaction;
    const countEl = container.querySelector(`[data-count-for="${key}"]`);
    const count = counts[key] || 0;
    if (countEl) countEl.textContent = count;
    const isActive = mine.includes(key);
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function setupReactions(post) {
  const container = document.getElementById('reactions');
  if (!container || !post) return;
  container.dataset.slug = post.slug;
  renderReactions(post.slug);

  if (container.dataset.bound === 'true') return;
  container.addEventListener('click', (e) => {
    const button = e.target.closest('.reaction-btn');
    if (!button) return;
    const slug = container.dataset.slug;
    const key = button.dataset.reaction;
    const state = getReactionState(slug);
    const index = state.mine.indexOf(key);
    if (index >= 0) {
      state.mine.splice(index, 1);
      state.counts[key] = Math.max(0, (state.counts[key] || 0) - 1);
    } else {
      state.mine.push(key);
      state.counts[key] = (state.counts[key] || 0) + 1;
    }
    saveReactionState(slug, state);
    renderReactions(slug);
  });
  container.dataset.bound = 'true';
}

// Setup share buttons
function setupShareButtons(post) {
  const postUrl = buildPostPermalink(post.slug);
  const postTitle = post.title;
  const nativeShare = document.getElementById('share-native');
  const twitterShare = document.getElementById('share-twitter');
  const discordShare = document.getElementById('share-discord');
  const copyShare = document.getElementById('share-copy');
  
  if (nativeShare) {
    if (navigator.share) {
      nativeShare.style.display = 'inline-flex';
      nativeShare.onclick = async (e) => {
        e.preventDefault();
        try {
          await navigator.share({
            title: postTitle,
            text: `Check out "${postTitle}" on Nomu's blog`,
            url: postUrl
          });
        } catch (err) {
          console.warn('Native share failed:', err);
        }
      };
    } else {
      nativeShare.style.display = 'none';
    }
  }

  if (twitterShare) {
    const twitterText = `Check out "${postTitle}" on Nomu's blog`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(postUrl)}`;
    twitterShare.href = twitterUrl;
    twitterShare.target = '_blank';
    twitterShare.rel = 'noopener noreferrer';
    twitterShare.onclick = null; // Ensure click goes through
  }
  
  const showCopySuccess = (button, message) => {
    if (!button) return;
    const icon = button.querySelector('i');
    const originalClass = icon ? icon.className : '';
    if (icon) {
      icon.className = 'fas fa-check';
    }
    button.classList.add('copied');
    button.style.borderColor = 'var(--accent)';
    setTimeout(() => {
      if (icon && originalClass) {
        icon.className = originalClass;
      }
      button.classList.remove('copied');
      button.style.borderColor = '';
    }, 2000);
    if (typeof showToast === 'function') {
      showToast(message || 'Copied');
    }
  };

  const copyTextFn = typeof copyText === 'function'
    ? copyText
    : (text) => navigator.clipboard.writeText(text).then(() => true).catch(() => false);

  if (discordShare) {
    // For Discord, copy the link to clipboard
    discordShare.onclick = (e) => {
      e.preventDefault();
      const shareText = `Check out "${postTitle}": ${postUrl}`;
      copyTextFn(shareText).then((ok) => {
        if (ok) {
          showCopySuccess(discordShare, 'Link copied!');
        } else {
          if (typeof showToast === 'function') showToast('Could not copy link.');
        }
      });
    };
  }
  
  if (copyShare) {
    copyShare.onclick = (e) => {
      e.preventDefault();
      copyTextFn(postUrl).then((ok) => {
        if (ok) {
          showCopySuccess(copyShare, 'Post link copied');
        } else {
          if (typeof showToast === 'function') showToast('Could not copy link.');
        }
      });
    };
  }
}

// Setup back to top button
function setupBackToTop() {
  const backToTopBtn = document.getElementById('back-to-top');
  
  if (!backToTopBtn || backToTopBtn.dataset.bound === 'true') return;
  backToTopBtn.dataset.bound = 'true';
  
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
  const stickyBack = document.getElementById('post-sticky-back');
  
  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      hideSinglePost();
    });
  }

  if (stickyBack) {
    stickyBack.addEventListener('click', () => {
      hideSinglePost();
    });
  }
}

// Initialize page
async function initPage() {
  const pageLoader = document.getElementById('page-loader');
  if (pageLoader) {
    pageLoader.classList.remove('hidden');
  }

  try {
    await loadPosts();

    setupBackToPosts();
    setupTOC();
    setupBackToTop();
    setupImageViewerGlobal();
    setupSearch();
    setupFilters();
    setupKeyboardPostNavigation();
    setupInfoLinks();
    setupHashRouter();

    renderPostsList(allPosts, currentPage);

    const initialRoute = resolveInitialRoute();
    const initialHash = buildHashForRoute(initialRoute);
    history.replaceState({}, '', `${window.location.pathname}${initialHash}`);
    await applyRoute(initialRoute, {
      initial: true,
      keepScroll: true,
      scrollBehavior: 'auto'
    });
  } catch (error) {
    console.error('initPage failed:', error);
  } finally {
    if (pageLoader) {
      pageLoader.classList.add('hidden');
    }
  }
}

