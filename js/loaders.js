/* ================================================================
   LOADERS.JS — All view render functions
================================================================ */

/* ─── Shared card builders ───────────────────────────────── */
function postCard(p, { compact = false } = {}) {
  const tags = (p.tags || []).slice(0, 3);
  return `<div class="post-card ${compact ? 'compact-home' : ''}" onclick="nav('article','${p.id}')">
    <div class="post-cover">
      ${p.cover
        ? `<img src="${p.cover}" alt="${p.title}" loading="lazy">`
        : `<div class="post-cover-placeholder">${tags[0] || 'Post'}</div>`
      }
    </div>
    <div class="post-body">
      <div class="post-tags">${tags.map(t => `<span class="post-tag">${t}</span>`).join('')}</div>
      <div class="post-title">${p.title}</div>
      <div class="post-excerpt">${p.description || ''}</div>
      <div class="post-meta">
        <span class="post-date">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${fmtDate(p.date)}
        </span>
        <span class="post-rt">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${p.readTime} min
        </span>
      </div>
    </div>
  </div>`;
}

function projCard(p) {
  const chips = [p.category, p.focus].filter(Boolean).map(x => `<span class="post-tag">${x}</span>`).join('');
  return `<div class="proj-card" onclick="nav('project','${p.id}')">
    <div class="proj-cover">
      ${p.cover
        ? `<img src="${p.cover}" alt="${p.name}" loading="lazy">`
        : `<div class="proj-cover-placeholder">${PROJ_ICONS[p.icon] || PROJ_ICONS.git}</div>`
      }
      ${p.badge ? `<div class="proj-cover-badge">${p.badge}</div>` : ''}
    </div>
    <div class="proj-body">
      <div class="post-tags">${chips}</div>
      <div class="proj-name">${p.name}</div>
      <div class="proj-desc">${p.description || ''}</div>
      <div class="proj-stack">${(p.stack || []).map(s => `<span class="stack-tag">${s}</span>`).join('')}</div>
    </div>
  </div>`;
}

function resCard(r) {
  return `<div class="res-card" onclick="nav('resource','${r.id}')">
    <div class="res-icon-row">
      <div class="res-icon">${RES_ICONS[r.type] || RES_ICONS.Site}</div>
      ${r.difficulty
        ? `<span class="res-difficulty" style="color:${DIFF_COLORS[r.difficulty] || 'var(--tm)'}">
            ${r.difficulty}
          </span>`
        : ''}
    </div>
    <div class="post-tags mb-2"><span class="post-tag">${r.type || 'Guide'}</span></div>
    <div class="res-title">${r.title}</div>
    <div class="res-desc">${r.desc || ''}</div>
  </div>`;
}

/* ─── HOME ───────────────────────────────────────────────── */
function renderHome() {
  const recent = [...DB.posts].sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, (typeof PAGINATION !== 'undefined') ? PAGINATION.homeRecentPosts : 2);
  document.getElementById('home-posts').innerHTML =
    `<div class="home-post-grid">${recent.map(p => postCard(p, { compact: true })).join('')}</div>`;

  const feat = DB.projects.filter(p => p.featured);
  document.getElementById('home-projects').innerHTML = feat.map(projCard).join('');
}

/* ─── BLOG ───────────────────────────────────────────────── */
function getBlogPageSize() { return (typeof PAGINATION !== 'undefined') ? PAGINATION.blogPageSize : 6; }

function getSortedPosts() {
  return [...DB.posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderBlog() {
  const filtered = getSortedPosts().filter(p =>
    BLOG_FILTER === 'all' || (p.tags || []).includes(BLOG_FILTER)
  );
  BLOG_PAGE_SIZE = getBlogPageSize();
  const totalPages = Math.max(1, Math.ceil(filtered.length / BLOG_PAGE_SIZE));
  BLOG_PAGE = Math.max(1, Math.min(BLOG_PAGE, totalPages));
  const start = (BLOG_PAGE - 1) * BLOG_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + BLOG_PAGE_SIZE);

  document.getElementById('blog-count').textContent =
    `${filtered.length} post${filtered.length !== 1 ? 's' : ''} · Page ${BLOG_PAGE}/${totalPages}`;

  document.getElementById('blog-posts').innerHTML = pageItems.length
    ? pageItems.map(p => postCard(p)).join('')
    : `<div class="tools-empty">No posts in this filter yet.</div>`;
}

function setBlogPage(page) {
  BLOG_PAGE = Math.max(1, page);
  const doRender = () => {
    renderBlog();
    document.getElementById('blog-posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  if (typeof runViewTransition === 'function') runViewTransition(doRender);
  else doRender();
}

function filterBlog(tag) {
  const raw = String(tag || '').trim();
  if (!raw || raw.toLowerCase() === 'all') {
    BLOG_FILTER = 'all';
  } else {
    const canonical = getAllTags().find(t => t.toLowerCase() === raw.toLowerCase());
    BLOG_FILTER = canonical || raw;
  }
  BLOG_PAGE = 1;
  const doRender = () => {
    renderBlog();
    updateQuickbar();
    playSfx('click');
  };
  if (typeof runViewTransition === 'function') runViewTransition(doRender);
  else doRender();
}

/* ─── Reusable filter tab builder ────────────────────────── */
function renderFilterTabs(mountId, items, active, allValue, onClickFn) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  const allItems = [allValue, ...items.filter(t => t !== allValue)];
  mount.innerHTML = allItems.map(t =>
    `<button class="filter-btn ${active === t ? 'active' : ''}" onclick="${onClickFn(t)}">${t === allValue ? 'All' : t}</button>`
  ).join('');
}

function renderTabRow(mountId, items, active, onClickFn, className = 'res-tab') {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.innerHTML = items.map(t =>
    `<span class="${className} ${active === t ? 'active' : ''}" onclick="${onClickFn(t)}">${t}</span>`
  ).join('');
}

/* ─── PROJECTS ───────────────────────────────────────────── */
const PROJECT_CATEGORIES_FALLBACK = ['All', 'Development', 'Motion Design', 'Video Editing'];
let PROJECT_SHOWCASE_OPEN = false;

function getProjectCategories() {
  return typeof PROJECT_CATEGORIES !== 'undefined' ? PROJECT_CATEGORIES : PROJECT_CATEGORIES_FALLBACK;
}

function getProjectFocusItems() {
  const map = typeof PROJECT_FOCUS_MAP !== 'undefined' ? PROJECT_FOCUS_MAP : { Development: ['All', 'AI', 'Web'] };
  return map[PROJ_CAT_FILTER] || null;
}

function renderProjects() {
  const cats = getProjectCategories();
  const focusItems = getProjectFocusItems();
  if (!focusItems) PROJ_FOCUS_FILTER = 'All';

  let items = [...DB.projects];
  if (PROJ_CAT_FILTER !== 'All') items = items.filter(p => (p.category || 'Development') === PROJ_CAT_FILTER);
  if (focusItems && PROJ_FOCUS_FILTER !== 'All') items = items.filter(p => (p.focus || '') === PROJ_FOCUS_FILTER);

  document.getElementById('proj-grid').innerHTML = items.length
    ? items.map(projCard).join('')
    : `<div class="tools-empty">No projects in this filter yet.</div>`;
}

function setProjCat(t) {
  PROJ_CAT_FILTER = t;
  const doRender = () => {
    renderProjects();
    updateQuickbar();
    playSfx('click');
  };
  if (typeof runViewTransition === 'function') runViewTransition(doRender);
  else doRender();
}
function setProjFocus(t) {
  PROJ_FOCUS_FILTER = t;
  const doRender = () => {
    renderProjects();
    updateQuickbar();
    playSfx('click');
  };
  if (typeof runViewTransition === 'function') runViewTransition(doRender);
  else doRender();
}

function isGithubUrl(url) { return /^https?:\/\/(www\.)?github\.com\//i.test(url || ''); }

function inferProjectPrimaryAction(project) {
  if (project.category === 'Motion Design' || project.category === 'Video Editing') return 'Watch';
  if (project.live) return 'Preview';
  if (project.url && !isGithubUrl(project.url)) return 'Visit';
  return 'Open';
}

function detailActions(item, kind = 'resource') {
  const actions = [];
  if (kind === 'project') {
    const isVideoEditing = item.category === 'Video Editing';
    const isCoding = item.category === 'Development';
    const repoLink = item.repo || (isGithubUrl(item.url) ? item.url : '');
    if (repoLink && !isVideoEditing)  actions.push(`<button class="share-btn" onclick="openUrl('${repoLink}')"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.38 7.86 10.9.57.1.78-.25.78-.55v-1.94c-3.19.69-3.86-1.57-3.86-1.57-.52-1.31-1.28-1.66-1.28-1.66-1.04-.7.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.73-1.53-2.55-.29-5.23-1.27-5.23-5.67 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 2.87-.39c.97.01 1.95.13 2.87.39 2.18-1.49 3.14-1.18 3.14-1.18.62 1.57.23 2.73.11 3.02.74.8 1.18 1.82 1.18 3.07 0 4.41-2.69 5.38-5.25 5.66.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"/></svg> GitHub</button>`);
    const mainLink = item.live || (!isGithubUrl(item.url) ? item.url : '');
    if (mainLink)  actions.push(`<button class="share-btn" onclick="openUrl('${mainLink}')">${inferProjectPrimaryAction(item)}</button>`);
    if (item.video && !isCoding) actions.push(`<button class="share-btn" onclick="openViewerVideo('${item.video}')">Watch Clip</button>`);
    return actions.join('');
  }
  if (item.url)   actions.push(`<button class="share-btn" onclick="openUrl('${item.url}')">Open Source</button>`);
  if (item.video) actions.push(`<button class="share-btn" onclick="openViewerVideo('${item.video}')">Watch</button>`);
  return actions.join('');
}

function renderProjectShowcase(item) {
  const media = [];
  if (item.cover) media.push({ type: 'image', src: item.cover, label: 'Cover' });
  (item.gallery || []).forEach((g, i) => media.push({ type: 'image', src: g.src, label: g.caption || `Gallery ${i + 1}` }));
  if (item.video) media.push({ type: 'video', src: item.video, label: 'Video' });

  const toggle = document.getElementById('proj-showcase-toggle');
  const shell  = document.getElementById('proj-showcase');
  if (!toggle || !shell) return;

  PROJECT_SHOWCASE_OPEN = false;
  shell.classList.add('collapsed');
  toggle.classList.remove('open');

  if (!media.length) {
    toggle.disabled = true;
    shell.innerHTML = '<div class="showcase-empty">No media attached yet.</div>';
    return;
  }
  toggle.disabled = false;
  shell.innerHTML = `<div class="project-showcase-grid">${
    media.map((m, idx) => m.type === 'image'
      ? `<button class="showcase-card" onclick="openViewerImage('${m.src}')"><img src="${m.src}" alt="${m.label}" loading="lazy"><span>${m.label || `Image ${idx + 1}`}</span></button>`
      : `<button class="showcase-card" onclick="openViewerVideo('${m.src}')"><div class="showcase-video-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="10 8 16 12 10 16 10 8"/></svg></div><span>${m.label || 'Video'}</span></button>`
    ).join('')
  }</div>`;
}

function toggleProjectShowcase() {
  const shell  = document.getElementById('proj-showcase');
  const toggle = document.getElementById('proj-showcase-toggle');
  if (!shell || !toggle || toggle.disabled) return;
  PROJECT_SHOWCASE_OPEN = !PROJECT_SHOWCASE_OPEN;
  shell.classList.toggle('collapsed', !PROJECT_SHOWCASE_OPEN);
  toggle.classList.toggle('open', PROJECT_SHOWCASE_OPEN);
  playSfx(PROJECT_SHOWCASE_OPEN ? 'open' : 'close');
}

/* ─── RESOURCES ──────────────────────────────────────────── */
function getResourceTypes() {
  const types = typeof RESOURCE_TYPES !== 'undefined'
    ? RESOURCE_TYPES
    : ['All', ...new Set(DB.resources.map(r => r.type || 'Guide'))];
  return types;
}

function renderResources() {
  const types = getResourceTypes();
  if (!types.includes(RES_TYPE_FILTER)) RES_TYPE_FILTER = 'All';

  let items = [...DB.resources];
  if (RES_TYPE_FILTER !== 'All') items = items.filter(r => (r.type || 'Guide') === RES_TYPE_FILTER);

  document.getElementById('res-body').innerHTML = items.length
    ? `<div class="res-grid">${items.map(resCard).join('')}</div>`
    : `<div class="tools-empty">No resources in this filter yet.</div>`;
}

function setResType(t) {
  RES_TYPE_FILTER = t;
  const doRender = () => {
    renderResources();
    updateQuickbar();
    playSfx('click');
  };
  if (typeof runViewTransition === 'function') runViewTransition(doRender);
  else doRender();
}

/* ─── ARTICLE ────────────────────────────────────────────── */
function navAdjacentPost(direction) {
  if (!CUR_POST) return;
  const posts = getSortedPosts();
  const idx = posts.findIndex(p => p.id === CUR_POST);
  if (idx === -1) return;
  const target = posts[idx + direction];
  if (target) nav('article', target.id);
}

function renderArticleNav(postId) {
  const posts = getSortedPosts();
  const idx = posts.findIndex(p => p.id === postId);
  const prev = idx < posts.length - 1 ? posts[idx + 1] : null;
  const next = idx > 0 ? posts[idx - 1] : null;
  document.getElementById('article-nav').innerHTML = `
    <button class="article-nav-btn" ${!prev ? 'disabled' : ''} onclick="navAdjacentPost(1)">
      <span class="article-nav-label">← Previous Post</span>
      <span class="article-nav-title">${prev ? prev.title : 'Start of posts'}</span>
    </button>
    <button class="article-nav-btn right" ${!next ? 'disabled' : ''} onclick="navAdjacentPost(-1)">
      <span class="article-nav-label">Next Post →</span>
      <span class="article-nav-title">${next ? next.title : 'Latest post'}</span>
    </button>`;
}

function syncHeaderReactionButtons(pid) {
  const state = REACTIONS[pid] || {};
  document.querySelectorAll('#art-header .art-react-btn[data-reaction]').forEach(btn => {
    const reaction = btn.dataset.reaction;
    const active = !!state[`_${reaction}`];
    btn.classList.toggle('reacted', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function doHeaderReaction(pid, reaction) {
  if (typeof doReact === 'function') doReact(pid, reaction);
  syncHeaderReactionButtons(pid);
}

function loadArticle(id) {
  const p = DB.posts.find(x => x.id === id);
  if (!p) return nav('blog');

  const header = document.getElementById('art-header');
  header.classList.toggle('detail-hero', !!p.cover);
  if (p.cover) {
    const raw = String(p.cover || '');
    const normalized = (/^(https?:)?\/\//.test(raw) || raw.startsWith('/'))
      ? raw
      : `/${raw.replace(/^\.?\//, '')}`;
    const coverUrl = normalized.replace(/"/g, '\\"');
    header.style.setProperty('--detail-cover', `url("${coverUrl}")`);
  } else {
    header.style.removeProperty('--detail-cover');
  }

  header.innerHTML = `
    <div class="art-actions art-action-toolbar">
      <button class="art-back in-header icon" type="button" onclick="nav('blog')" aria-label="Back to blog" title="Back to blog">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button class="art-icon-btn art-read-btn" id="reading-mode-toggle" type="button" onclick="toggleReadingMode()" aria-label="Reading mode" title="Reading mode">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 4h18v16H3z" />
          <path d="M7 8h10" />
          <path d="M7 12h10" />
          <path d="M7 16h6" />
        </svg>
      </button>
    </div>
    <div class="art-tags">${(p.tags || []).map(t => `<span class="post-tag">${t}</span>`).join('')}</div>
    <h1 class="art-title">${p.title}</h1>
    <p class="art-desc">${p.description || ''}</p>
    <div class="art-meta">
      <div class="art-author">
        <div class="author-av">${DB.site.initials || 'N'}</div>
        <span class="author-name">${DB.site.author || 'Author'}</span>
      </div>
      <span class="art-date">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${fmtDate(p.date)}
      </span>
      <span class="art-rt">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${p.readTime} min read
      </span>
    </div>`;

  // Use unified markdown renderer (Prism + KaTeX)
  const body = document.getElementById('art-body');
  renderMarkdown(p.markdown || '', body);

  // Heading anchors
  body.querySelectorAll('h1,h2,h3,h4').forEach((h, i) => {
    const aid = `h-${i}`;
    h.id = aid;
    h.title = 'Click to copy anchor link';
    h.addEventListener('click', () => {
      navigator.clipboard.writeText(`${location.href.split('#')[0]}#${p.id}--${aid}`)
        .then(() => toast('Heading link copied!'));
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  bindInlineMedia(body);
  renderReactions(p.id);
  syncHeaderReactionButtons(p.id);
  renderShareBar(p);
  renderComments(p.id);
  setTimeout(buildTOC, 80);
  if (typeof updateReadingModeUI === 'function') updateReadingModeUI();
  if (typeof syncReadingModeClass === 'function') syncReadingModeClass();
}

/* ─── Detail helpers ─────────────────────────────────────── */
function renderMediaCards(item) {
  const cards = [];
  if (item.cover) cards.push(`<div class="res-card media-card" onclick="openViewerImage('${item.cover}')"><div class="res-title">Cover</div><img src="${item.cover}" alt="cover" loading="lazy"></div>`);
  (item.gallery || []).forEach((g, i) => {
    cards.push(`<div class="res-card media-card" onclick="openViewerImage('${g.src}')"><div class="res-title">${g.caption || `Image ${i + 1}`}</div><img src="${g.src}" alt="gallery" loading="lazy"></div>`);
  });
  if (item.video) cards.push(`<div class="res-card media-card" onclick="openViewerVideo('${item.video}')"><div class="res-title">Video</div><div class="res-desc">Open video viewer</div></div>`);
  return cards.join('');
}

function renderResourceSteps(steps) {
  if (!steps.length) return `<div class="resource-panel-title">Step Outline</div><div class="resource-panel-empty">No steps provided yet.</div>`;
  return `<div class="resource-panel-title">Step Outline</div><ol class="resource-step-list">${steps.map(s => `<li>${s}</li>`).join('')}</ol>`;
}

function renderResourceLinks(links, url) {
  const allLinks = [...links];
  if (url && !allLinks.some(l => l.url === url)) allLinks.unshift({ label: 'Primary Link', url });
  if (!allLinks.length) return `<div class="resource-panel-title">Quick Links</div><div class="resource-panel-empty">No links provided yet.</div>`;
  return `<div class="resource-panel-title">Quick Links</div><div class="resource-link-list">${
    allLinks.map(link => `<button class="resource-link-item" onclick="openUrl('${link.url}')">${link.label}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg></button>`)
    .join('')
  }</div>`;
}

/* ─── Detail views ───────────────────────────────────────── */
function loadProjectDetail(id) {
  const p = DB.projects.find(x => x.id === id);
  if (!p) return nav('projects');

  const header = document.getElementById('proj-header');
  header.classList.toggle('detail-hero', !!p.cover);
  if (p.cover) {
    const raw = String(p.cover || '');
    const normalized = (/^(https?:)?\/\//.test(raw) || raw.startsWith('/'))
      ? raw
      : `/${raw.replace(/^\.?\//, '')}`;
    const coverUrl = normalized.replace(/"/g, '\\"');
    header.style.setProperty('--detail-cover', `url("${coverUrl}")`);
  } else {
    header.style.removeProperty('--detail-cover');
  }

  header.innerHTML = `
    <div class="art-actions art-action-toolbar">
      <button class="art-back in-header icon" type="button" onclick="nav('projects')" aria-label="Back to projects" title="Back to projects">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    </div>
    <div class="art-tags">${[p.category, p.focus, p.badge].filter(Boolean).map(t => `<span class="post-tag">${t}</span>`).join('')}</div>
    <h1 class="art-title">${p.name}</h1>
    <p class="art-desc">${p.description || ''}</p>
    <div class="art-meta"><span class="art-rt">${(p.stack || []).join(' · ')}</span></div>`;

  document.getElementById('proj-actions').innerHTML = detailActions(p, 'project');
  renderProjectShowcase(p);

  const body = document.getElementById('proj-body');
  renderMarkdown(p.markdown || '', body);
  bindInlineMedia(body);
}

function loadResourceDetail(id) {
  const r = DB.resources.find(x => x.id === id);
  if (!r) return nav('resources');

  document.getElementById('resd-header').innerHTML = `
    <div class="art-tags">${[r.type, r.difficulty].filter(Boolean).map(t => `<span class="post-tag">${t}</span>`).join('')}</div>
    <h1 class="art-title">${r.title}</h1>
    <p class="art-desc">${r.desc || ''}</p>`;

  document.getElementById('resd-actions').innerHTML = detailActions(r, 'resource');
  document.getElementById('resd-media').innerHTML   = renderMediaCards(r);
  document.getElementById('resd-steps').innerHTML   = renderResourceSteps(r.steps || []);
  document.getElementById('resd-links').innerHTML   = renderResourceLinks(r.quickLinks || [], r.url || '');

  const body = document.getElementById('resd-body');
  renderMarkdown(r.markdown || '', body);
  bindInlineMedia(body);
}
