/* ================================================================
   QUICKBAR.JS — Context-aware left-rail sidebar content
================================================================ */
function hasTarget(id) { return !!document.getElementById(id); }

const QB_ICONS = {
  dot: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10l-8 8-10-10V2h6l12 8z"/><circle cx="7" cy="7" r="1.5"/></svg>`,
  prev: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`,
  cat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/></svg>`,
  focus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`,
  tool: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6L5 19.7l6-6a4 4 0 0 0 5.4-5.4z"/></svg>`,
  active: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15 9 22 9 16 13 18 20 12 16 6 20 8 13 2 9 9 9"/></svg>`,
};

const qbIcon = (key) => `<span class="qb-icon">${QB_ICONS[key] || QB_ICONS.dot}</span>`;
const qbIconSvg = (svg) => `<span class="qb-icon cat-icon">${svg || QB_ICONS.dot}</span>`;
const qbText = (label) => `<span class="qb-text">${label}</span>`;

function updateQuickbar() {
  const qb = document.getElementById('quickbar');
  if (!qb) return;

  switch (CUR_VIEW) {
    case 'article':
      {
        const posts = typeof getSortedPosts === 'function' ? getSortedPosts() : [];
        const idx = posts.findIndex(p => p.id === CUR_POST);
        const prev = idx < posts.length - 1 ? posts[idx + 1] : null;
        const next = idx > 0 ? posts[idx - 1] : null;
        qb.innerHTML = `
          <div class="qb-label">Navigation</div>
          <div class="toc-item ${prev ? '' : 'disabled'}" ${prev ? 'onclick="navAdjacentPost(1)"' : ''}>
            ${qbIcon('prev')}${qbText(prev ? 'Previous Post' : 'Start of posts')}
          </div>
          <div class="toc-item ${next ? '' : 'disabled'}" ${next ? 'onclick="navAdjacentPost(-1)"' : ''}>
            ${qbIcon('next')}${qbText(next ? 'Next Post' : 'Latest post')}
          </div>
          <div class="qb-label">On This Page</div>
          <div id="toc-container"></div>`;
      }
      break;

    case 'blog': {
      const tags = getAllTags();
      const allTags = ['all', ...tags];
      qb.innerHTML = `
        <div class="qb-label">Filters</div>
        ${allTags.map(t => `<div class="toc-item ${BLOG_FILTER === t ? 'active' : ''}" onclick="filterBlog('${t}')">${qbIcon('tag')}${qbText(t === 'all' ? 'All' : t)}</div>`).join('')}
        <div class="qb-label">Pagination</div>
        <div class="toc-item" onclick="setBlogPage(Math.max(1,BLOG_PAGE-1))">${qbIcon('prev')}${qbText('Previous Page')}</div>
        <div class="toc-item" onclick="setBlogPage(BLOG_PAGE+1)">${qbIcon('next')}${qbText('Next Page')}</div>`;
      break;
    }

    case 'projects': {
      const cats = typeof PROJECT_CATEGORIES !== 'undefined' ? PROJECT_CATEGORIES : ['All', 'Development', 'Motion Design', 'Video Editing'];
      const focusMap = typeof PROJECT_FOCUS_MAP !== 'undefined' ? PROJECT_FOCUS_MAP : { Development: ['All', 'AI', 'Web'] };
      const focusItems = focusMap[PROJ_CAT_FILTER] || null;
      qb.innerHTML = `
        <div class="qb-label">Category</div>
        ${cats.map(c => {
          const active = PROJ_CAT_FILTER === c;
          const iconSvg = (window.PROJECT_CATEGORY_ICON_MAP && window.PROJECT_CATEGORY_ICON_MAP[c]) || QB_ICONS.cat;
          const focusHtml = active && focusItems
            ? focusItems.map(f => `<div class="toc-item ${PROJ_FOCUS_FILTER === f ? 'active' : ''}" data-level="2" onclick="setProjFocus('${f}')">${qbIcon('focus')}${qbText(f)}</div>`).join('')
            : '';
          return `<div class="toc-item ${active ? 'active' : ''}" onclick="setProjCat('${c}')">${qbIconSvg(iconSvg)}${qbText(c)}</div>${focusHtml}`;
        }).join('')}</div>`;
      break;
    }

    case 'resources': {
      const types = typeof RESOURCE_TYPES !== 'undefined' ? RESOURCE_TYPES : ['All'];
      qb.innerHTML = `
        <div class="qb-label">Type</div>
        ${types.map(t => {
          const iconSvg = t === 'All' ? QB_ICONS.tag : (RES_ICONS[t] || QB_ICONS.tag);
          return `<div class="toc-item ${RES_TYPE_FILTER === t ? 'active' : ''}" onclick="setResType('${t}')">${qbIconSvg(iconSvg)}${qbText(t)}</div>`;
        }).join('')}`;
      break;
    }

    case 'tools': {
      const cats = (window.TOOL_CATEGORIES && window.TOOL_CATEGORIES.length)
        ? window.TOOL_CATEGORIES
        : [...new Set(DB.tools.map(getToolCategory))];
      const activeTool = DB.tools.find(t => t.id === CUR_TOOL);
      const activeIcon = activeTool && window.TOOL_ICONS ? window.TOOL_ICONS[activeTool.icon] : null;
      qb.innerHTML = `
        <div class="qb-label">Categories</div>
        ${cats.map(c => {
          const iconSvg = (window.TOOL_CATEGORY_ICON_MAP && window.TOOL_CATEGORY_ICON_MAP[c]) || QB_ICONS.tool;
          return `<div class="toc-item ${TOOL_CATEGORY_FILTER === c ? 'active' : ''}" onclick='setToolCategory(${JSON.stringify(c)})'>${qbIconSvg(iconSvg)}${qbText(c)}</div>`;
        }).join('')}
        ${CUR_TOOL ? `<div class="qb-label">Active Tool</div><div class="toc-item active" onclick="openTool('${CUR_TOOL}')">${qbIconSvg(activeIcon || QB_ICONS.active)}${qbText(activeTool ? activeTool.name : CUR_TOOL)}</div>` : ''}`;
      break;
    }

    case 'home': {
      qb.innerHTML = '';
      break;
    }

    default:
      qb.innerHTML = '';
  }
}

function buildTagPills(tags, active, onClickFn) {
  return tags.map(t => {
    const label = t === 'all' ? 'All' : t;
    return `<span class="tag-pill ${active === t ? 'active' : ''}" onclick="${onClickFn(t)}">${label}</span>`;
  }).join('');
}

function scrollInMain(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
