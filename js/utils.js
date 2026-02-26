// utils.js - Utility Functions
// NO MODULE EXPORTS - Using global scope for compatibility

// Get query parameter from URL
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Format date nicely (e.g., "February 14, 2025")
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Calculate reading time in minutes based on word count
function calculateReadingTime(text) {
  const wordsPerMinute = 150; // Average reading speed
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes;
}

// Parse frontmatter from markdown content
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  
  const frontmatterText = match[1];
  const body = match[2];
  
  const frontmatter = {};
  const lines = frontmatterText.split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      frontmatter[key] = value;
    }
  }
  
  return { frontmatter, body };
}

// Format category for display
function formatCategory(category) {
  const categoryMap = {
    'Development': 'Development',
    'Video Editing': 'Projects',
    'Life': 'Life',
    'Projects': 'Projects',
    'Politics': 'Politics',
  };
  return categoryMap[category] || category;
}

// Debounce function for search
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

let pageLoaderHideTimer = null;
function showPageLoader() {
  const loader = document.getElementById('page-loader');
  if (!loader) return;
  if (pageLoaderHideTimer) {
    clearTimeout(pageLoaderHideTimer);
    pageLoaderHideTimer = null;
  }
  loader.classList.remove('hidden');
}

function hidePageLoader(delay = 260) {
  const loader = document.getElementById('page-loader');
  if (!loader) return;
  if (pageLoaderHideTimer) {
    clearTimeout(pageLoaderHideTimer);
  }
  pageLoaderHideTimer = window.setTimeout(() => {
    loader.classList.add('hidden');
  }, Math.max(0, delay));
}

window.showPageLoader = showPageLoader;
window.hidePageLoader = hidePageLoader;

// Copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    console.log('Copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// Update active nav link based on current page
function updateActiveNavLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    if (!linkPath) return;

    if (currentPath.includes(linkPath) || 
       (linkPath === '/' && (currentPath === '/' || currentPath.endsWith('index.html'))) ||
       (linkPath === 'index.html' && currentPath === '/')) {
       link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function updateSimpleUiToggle(isEnabled) {
  const toggles = document.querySelectorAll('.simple-ui-toggle');
  toggles.forEach((toggle) => {
    toggle.classList.toggle('active', isEnabled);
    const boolValue = isEnabled ? 'true' : 'false';
    toggle.setAttribute('aria-pressed', boolValue);
    toggle.setAttribute('aria-checked', boolValue);
    if (toggle.dataset.compact !== 'true') {
      toggle.textContent = isEnabled ? 'Simple UI: On' : 'Simple UI: Off';
    }
  });
}

let simpleUiExitTimer = null;

function setSimpleUi(enabled) {
  const body = document.body;
  if (!enabled && body.classList.contains('simple-ui')) {
    body.classList.add('simple-ui-exit');
    if (simpleUiExitTimer) {
      clearTimeout(simpleUiExitTimer);
    }
    simpleUiExitTimer = window.setTimeout(() => {
      body.classList.remove('simple-ui-exit');
    }, 260);
  } else if (enabled) {
    body.classList.remove('simple-ui-exit');
    if (simpleUiExitTimer) {
      clearTimeout(simpleUiExitTimer);
      simpleUiExitTimer = null;
    }
  }

  body.classList.toggle('simple-ui', enabled);
  localStorage.setItem('simple-ui', enabled ? 'yes' : 'no');
  updateSimpleUiToggle(enabled);
}

function initSimpleUiPreference() {
  const enabled = localStorage.getItem('simple-ui') === 'yes';
  document.body.classList.toggle('simple-ui', enabled);
  updateSimpleUiToggle(enabled);
}

function setTopNavActive(targetId, options = {}) {
  const buttons = document.querySelectorAll('.main-nav .nav-btn');
  buttons.forEach((btn) => {
    btn.classList.toggle('active', btn.id === targetId);
  });

  const indicator = document.getElementById('nav-state-indicator');
  if (indicator) {
    const fallbackLabels = {
      '': 'Homepage',
      'nav-blog': 'Blog',
      'nav-projects': 'Projects',
      'nav-resources': 'Resources',
      'nav-games': 'Games',
      'nav-tools': 'Tools'
    };
    const indicatorText = options.label || fallbackLabels[targetId] || 'Homepage';
    indicator.textContent = indicatorText;
    indicator.setAttribute('data-state', targetId || 'home');
  }
}

function scrollToElementWithHeaderOffset(targetElement, extraOffset = 10) {
  if (!targetElement) return;
  const header = document.querySelector('.site-header');
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const targetTop = targetElement.getBoundingClientRect().top + window.pageYOffset;
  const finalTop = Math.max(0, targetTop - headerHeight - extraOffset);
  window.scrollTo({ top: finalTop, behavior: 'smooth' });
}

function setupHeaderScrollState() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const syncScrollClass = () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  };

  syncScrollClass();
  window.addEventListener('scroll', syncScrollClass, { passive: true });
}

function focusQuickSearch() {
  const mainSearch = document.getElementById('search-input');
  if (mainSearch && mainSearch.offsetParent !== null) {
    mainSearch.focus();
    if (typeof mainSearch.select === 'function') mainSearch.select();
    return true;
  }

  const blogSection = document.querySelector('.blog-section');
  const hubView = blogSection ? blogSection.dataset.hubView : 'home';
  const railKey = hubView === 'projects' ? 'projects' : (hubView === 'resources' ? 'resources' : (hubView === 'posts' ? 'posts' : ''));
  if (!railKey) return false;
  const input = document.querySelector(`[data-rail-search="${railKey}"]`);
  if (input) {
    input.focus();
    if (typeof input.select === 'function') input.select();
    return true;
  }
  return false;
}

function setupGlobalShortcuts() {
  document.addEventListener('keydown', (event) => {
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    const tag = document.activeElement ? document.activeElement.tagName : '';
    const isEditable = document.activeElement && (document.activeElement.isContentEditable ||
      tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
    if (isEditable && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    const key = String(event.key || '').toLowerCase();
    if (key === '1') {
      event.preventDefault();
      showBlogSectionView('all', { hubView: 'home', scrollTo: 'home', navTarget: '' });
    } else if (key === '2') {
      event.preventDefault();
      showBlogSectionView('all', { hubView: 'projects', scrollTo: 'projects', navTarget: 'nav-projects' });
    } else if (key === '3') {
      event.preventDefault();
      showBlogSectionView('all', { hubView: 'resources', scrollTo: 'resources', navTarget: 'nav-resources' });
    } else if (key === '4') {
      event.preventDefault();
      showBlogSectionView('all', { hubView: 'posts', scrollTo: 'posts', navTarget: 'nav-blog' });
    } else if (key === '5') {
      event.preventDefault();
      showToolsDashboardView();
    } else if (key === 'f') {
      event.preventDefault();
      focusQuickSearch();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (window.navigatePagination && typeof window.navigatePagination.next === 'function') {
        window.navigatePagination.next();
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (window.navigatePagination && typeof window.navigatePagination.prev === 'function') {
        window.navigatePagination.prev();
      }
    }
  });
}

window.focusQuickSearch = focusQuickSearch;

function buildGlobalSearchItems() {
  const data = typeof window.getGlobalSearchData === 'function' ? window.getGlobalSearchData() : { posts: [], projects: [], resources: [] };
  const items = [];

  (data.posts || []).forEach((post) => {
    items.push({
      label: post.title,
      detail: `Post • ${formatCategory(post.category)}`,
      type: 'post',
      run: () => typeof showSinglePost === 'function' && showSinglePost(post.slug)
    });
  });

  (data.projects || []).forEach((project) => {
    items.push({
      label: project.title,
      detail: `Project • ${project.type || 'Project'}`,
      type: 'project',
      run: () => typeof showProjectShowcase === 'function' && showProjectShowcase(project.id)
    });
  });

  (data.resources || []).forEach((resource) => {
    items.push({
      label: resource.title,
      detail: `Resource • ${resource.type || 'Resource'}`,
      type: 'resource',
      run: () => resource.external
        ? window.open(resource.url, '_blank', 'noopener')
        : (typeof showResourcePage === 'function' && showResourcePage(resource.slug))
    });
  });

  if (window.toolsDashboard && typeof window.toolsDashboard.listToolMeta === 'function') {
    const toolMeta = window.toolsDashboard.listToolMeta();
    toolMeta.forEach((meta) => {
      items.push({
        label: meta.title,
        detail: `Tool • ${meta.tabLabel || meta.tabId || 'Tools'}`,
        type: 'tool',
        run: () => window.toolsDashboard.openTool && window.toolsDashboard.openTool(meta.id)
      });
    });
  }

  return items;
}

function openGlobalSearch(initial = '') {
  const modal = document.getElementById('global-search');
  const input = document.getElementById('global-search-input');
  const results = document.getElementById('global-search-results');
  if (!modal || !input || !results) return;
  let visibleItems = [];
  let activeIndex = 0;

  const setActiveResult = (index) => {
    if (!visibleItems.length) return;
    activeIndex = Math.max(0, Math.min(index, visibleItems.length - 1));
    results.querySelectorAll('.global-search-item').forEach((btn, idx) => {
      const active = idx === activeIndex;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) {
        btn.scrollIntoView({ block: 'nearest' });
      }
    });
  };

  const render = (query = '') => {
    const q = query.trim().toLowerCase();
    visibleItems = buildGlobalSearchItems()
      .map((item) => {
        const haystack = `${item.label} ${item.detail}`.toLowerCase();
        const idx = haystack.indexOf(q);
        return { item, score: idx < 0 ? Number.POSITIVE_INFINITY : idx };
      })
      .filter((x) => (q ? x.score < Number.POSITIVE_INFINITY : true))
      .sort((a, b) => a.score - b.score)
      .slice(0, 12)
      .map((x) => x.item);

    if (!visibleItems.length) {
      results.innerHTML = '<li class="global-search-empty">No results.</li>';
      return;
    }

    results.innerHTML = visibleItems.map((item, idx) => `
      <li>
        <button class="global-search-item${idx === 0 ? ' active' : ''}" type="button" role="option" aria-selected="${idx === 0 ? 'true' : 'false'}" data-index="${idx}">
          <span class="global-search-label">${item.label}</span>
          <span class="global-search-detail">${item.detail}</span>
        </button>
      </li>
    `).join('');
    activeIndex = 0;

    results.querySelectorAll('.global-search-item').forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        const idx = Number(btn.dataset.index || 0);
        setActiveResult(idx);
      });
      btn.addEventListener('click', () => {
        const selected = visibleItems[Number(btn.dataset.index || 0)];
        if (!selected) return;
        closeGlobalSearch();
        selected.run();
      });
    });
  };

  modal.hidden = false;
  modal.classList.add('open');
  input.value = initial;
  render(initial);
  input.focus();
  input.select();

  input.oninput = () => render(input.value || '');
  input.onkeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeGlobalSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!visibleItems.length) return;
      const next = (activeIndex + 1) % visibleItems.length;
      setActiveResult(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!visibleItems.length) return;
      const prev = (activeIndex - 1 + visibleItems.length) % visibleItems.length;
      setActiveResult(prev);
    } else if (e.key === 'Enter') {
      const current = results.querySelector(`.global-search-item[data-index="${activeIndex}"]`) || results.querySelector('.global-search-item');
      if (current) current.click();
    }
  };
}

function closeGlobalSearch() {
  const modal = document.getElementById('global-search');
  if (!modal) return;
  modal.classList.remove('open');
  modal.hidden = true;
}

window.openGlobalSearch = openGlobalSearch;

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && String(e.key || '').toLowerCase() === 'l') {
    e.preventDefault();
    openGlobalSearch('');
  }
});

document.addEventListener('click', (e) => {
  const closeEl = e.target.closest('[data-global-search-close]');
  if (closeEl) closeGlobalSearch();
});

function showToolsDashboardView(options = {}) {
  const toolsDashboard = document.getElementById('tools-dashboard');
  const featuredSection = document.getElementById('featured-section');
  const blogSection = document.querySelector('.blog-section');
  const singlePostView = document.getElementById('single-post-view');
  const contactSection = document.querySelector('.contact');
  const useLoader = options.showLoader !== false;
  if (!toolsDashboard) return;

  const openView = () => {
    if (useLoader) {
      showPageLoader();
    }
    if (featuredSection) featuredSection.style.display = 'none';
    if (blogSection) blogSection.style.display = 'none';
    if (singlePostView) singlePostView.style.display = 'none';
    if (contactSection) contactSection.style.display = 'none';
    toolsDashboard.style.display = 'block';
    if (typeof window.setLeftRailContext === 'function') {
      window.setLeftRailContext('tools');
    }
    setTopNavActive('nav-tools', { label: 'Tools' });
    scrollToElementWithHeaderOffset(toolsDashboard, 8);
    if (options.pushState !== false) {
      history.pushState({}, '', window.location.pathname);
    }
    if (useLoader) {
      hidePageLoader(260);
    }
  };

  if (singlePostView && singlePostView.style.display !== 'none' && typeof hideSinglePost === 'function') {
    hideSinglePost({ updateUrl: false, preserveScroll: true });
    setTimeout(openView, 360);
    return;
  }
  openView();
}

function showBlogSectionView(category = 'all', options = {}) {
  const toolsDashboard = document.getElementById('tools-dashboard');
  const featuredSection = document.getElementById('featured-section');
  const blogSection = document.querySelector('.blog-section');
  const singlePostView = document.getElementById('single-post-view');
  const contactSection = document.querySelector('.contact');
  const useLoader = options.showLoader !== false;
  const scrollTo = options.scrollTo || 'home';
  const hubView = options.hubView ||
    (scrollTo === 'projects'
      ? 'projects'
      : (scrollTo === 'resources'
        ? 'resources'
        : (scrollTo === 'games' ? 'games' : (scrollTo === 'posts' ? 'posts' : 'home'))));
  const navTarget = options.navTarget ||
    (hubView === 'projects'
      ? 'nav-projects'
      : (hubView === 'resources'
        ? 'nav-resources'
        : (hubView === 'games' ? 'nav-games' : (hubView === 'posts' ? 'nav-blog' : ''))));
  const navLabelMap = {
    '': 'Homepage',
    'nav-blog': 'Posts',
    'nav-projects': 'Projects',
    'nav-resources': 'Resources',
    'nav-games': 'Games',
    'nav-tools': 'Tools'
  };

  const openView = () => {
    if (useLoader) {
      showPageLoader();
    }
    if (toolsDashboard) toolsDashboard.style.display = 'none';
    if (blogSection) blogSection.style.display = 'block';
    if (contactSection) contactSection.style.display = 'block';
    if (featuredSection) {
      featuredSection.style.display = hubView === 'home' ? 'grid' : 'none';
    }

    if (typeof window.ensureBlogControlsReady === 'function') {
      window.ensureBlogControlsReady();
    }

    if (typeof window.setContentHubView === 'function') {
      window.setContentHubView(hubView, {
        syncUrl: options.skipUrlSync ? false : options.syncUrl,
        replaceState: options.replaceState,
        suppressNavSync: true,
        showLoader: false
      });
    } else if (typeof window.setLeftRailContext === 'function') {
      window.setLeftRailContext(hubView);
    }

    if (hubView === 'posts' && typeof window.applyCategoryFilter === 'function') {
      window.applyCategoryFilter(category, {
        clearSearch: options.clearSearch !== false,
        suppressAutoScroll: true,
        resetPage: options.resetPage,
        updateUrl: options.skipUrlSync ? false : options.syncUrl,
        replaceState: options.replaceState
      });
    }

    setTopNavActive(navTarget, { label: navLabelMap[navTarget] || 'Homepage' });
    const searchBar = document.getElementById('blog-search-bar') || document.querySelector('.search-bar');
    const projectsShowcase = document.getElementById('projects-showcase');
    const resourcesShowcase = document.getElementById('resources-showcase');
    const postsBrowser = document.getElementById('posts-browser');
    const homeHub = document.querySelector('.blog-section');
    const target = scrollTo === 'projects'
      ? projectsShowcase
      : (scrollTo === 'resources'
        ? resourcesShowcase
        : (scrollTo === 'posts'
          ? postsBrowser
          : (scrollTo === 'search' ? searchBar : homeHub)));
    if (target && scrollTo !== 'none') {
      const extraOffset = scrollTo === 'search' ? 14 : 8;
      scrollToElementWithHeaderOffset(target, extraOffset);
    }
    if (useLoader) {
      hidePageLoader(260);
    }
  };

  if (singlePostView && singlePostView.style.display !== 'none' && typeof hideSinglePost === 'function') {
    hideSinglePost({ updateUrl: false, preserveScroll: true });
    setTimeout(openView, 360);
    return;
  }
  openView();
}

function setupTopNavigation() {
  const navBlog = document.getElementById('nav-blog');
  const navProjects = document.getElementById('nav-projects');
  const navResources = document.getElementById('nav-resources');
  const navGames = document.getElementById('nav-games');
  const navTools = document.getElementById('nav-tools');
  if (!navBlog || !navProjects || !navTools) return;

  navBlog.addEventListener('click', () => {
    showBlogSectionView('all', {
      hubView: 'posts',
      scrollTo: 'posts',
      navTarget: 'nav-blog',
      replaceState: false,
      clearSearch: false
    });
  });

  navProjects.addEventListener('click', () => {
    showBlogSectionView('all', {
      hubView: 'projects',
      scrollTo: 'projects',
      navTarget: 'nav-projects',
      replaceState: false
    });
  });

  if (navResources) {
    navResources.addEventListener('click', () => {
      showBlogSectionView('all', {
        hubView: 'resources',
        scrollTo: 'resources',
        navTarget: 'nav-resources',
        replaceState: false
      });
    });
  }

  if (navGames) {
    navGames.addEventListener('click', () => {
      showBlogSectionView('all', {
        hubView: 'games',
        scrollTo: 'games',
        navTarget: 'nav-games',
        replaceState: false
      });
    });
  }

  navTools.addEventListener('click', () => {
    showToolsDashboardView();
  });
}

function setupToolsDashboard() {
  const toolsDashboard = document.getElementById('tools-dashboard');
  if (!toolsDashboard) return;

  const gpaRows = document.getElementById('gpa-rows');
  const gpaAddRow = document.getElementById('gpa-add-row');
  const gpaCalc = document.getElementById('gpa-calc');
  const gpaResult = document.getElementById('gpa-result');

  const createGpaRow = () => {
    const row = document.createElement('div');
    row.className = 'gpa-row';
    row.innerHTML = `
      <input class="gpa-credits" type="number" min="0" step="0.5" value="3" aria-label="Course credits">
      <select class="gpa-grade" aria-label="Letter grade">
        <option value="4.0">A</option>
        <option value="3.7">A-</option>
        <option value="3.3">B+</option>
        <option value="3.0">B</option>
        <option value="2.7">B-</option>
        <option value="2.3">C+</option>
        <option value="2.0">C</option>
        <option value="1.7">C-</option>
        <option value="1.3">D+</option>
        <option value="1.0">D</option>
        <option value="0">F</option>
      </select>
      <button class="tool-row-remove" type="button" aria-label="Remove course">
        <i class="fas fa-times" aria-hidden="true"></i>
      </button>
    `;
    const removeBtn = row.querySelector('.tool-row-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        row.remove();
      });
    }
    return row;
  };

  if (gpaAddRow && gpaRows) {
    gpaAddRow.addEventListener('click', () => {
      gpaRows.appendChild(createGpaRow());
    });
  }

  if (gpaCalc && gpaRows && gpaResult) {
    gpaCalc.addEventListener('click', () => {
      let gradePoints = 0;
      let totalCredits = 0;
      const rows = gpaRows.querySelectorAll('.gpa-row');
      rows.forEach((row) => {
        const creditsInput = row.querySelector('.gpa-credits');
        const gradeInput = row.querySelector('.gpa-grade');
        const credits = parseFloat(creditsInput ? creditsInput.value : '0');
        const grade = parseFloat(gradeInput ? gradeInput.value : '0');
        if (Number.isFinite(credits) && credits > 0 && Number.isFinite(grade)) {
          totalCredits += credits;
          gradePoints += credits * grade;
        }
      });
      const gpa = totalCredits > 0 ? (gradePoints / totalCredits) : 0;
      gpaResult.textContent = `GPA: ${gpa.toFixed(2)}`;
    });
  }

  const pwLength = document.getElementById('password-length');
  const pwLengthValue = document.getElementById('password-length-value');
  const pwUppercase = document.getElementById('pw-uppercase');
  const pwNumbers = document.getElementById('pw-numbers');
  const pwSymbols = document.getElementById('pw-symbols');
  const pwGenerate = document.getElementById('pw-generate');
  const pwCopy = document.getElementById('pw-copy');
  const pwOutput = document.getElementById('pw-output');

  const buildPassword = (length) => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+[]{}<>?';
    let chars = lowercase;
    if (pwUppercase && pwUppercase.checked) chars += uppercase;
    if (pwNumbers && pwNumbers.checked) chars += numbers;
    if (pwSymbols && pwSymbols.checked) chars += symbols;
    if (!chars) chars = lowercase;

    let output = '';
    for (let i = 0; i < length; i++) {
      output += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return output;
  };

  if (pwLength && pwLengthValue) {
    pwLength.addEventListener('input', () => {
      pwLengthValue.textContent = pwLength.value;
    });
  }

  if (pwGenerate && pwOutput && pwLength) {
    pwGenerate.addEventListener('click', () => {
      const length = Math.max(8, Math.min(64, parseInt(pwLength.value, 10) || 16));
      pwOutput.value = buildPassword(length);
    });
    pwGenerate.click();
  }

  if (pwCopy && pwOutput) {
    pwCopy.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(pwOutput.value || '');
        } else {
          const fallback = document.createElement('textarea');
          fallback.value = pwOutput.value || '';
          fallback.setAttribute('readonly', '');
          fallback.style.position = 'fixed';
          fallback.style.top = '-9999px';
          document.body.appendChild(fallback);
          fallback.select();
          const copied = document.execCommand('copy');
          document.body.removeChild(fallback);
          if (!copied) {
            throw new Error('execCommand copy failed');
          }
        }
        if (window.showToast) window.showToast('Copied');
      } catch (error) {
        if (window.showToast) window.showToast('Copy failed');
      }
    });
  }

  const textInput = document.getElementById('text-input');
  const textOutput = document.getElementById('text-output');
  const textUpper = document.getElementById('text-upper');
  const textLower = document.getElementById('text-lower');
  const textTitle = document.getElementById('text-title');
  const textClean = document.getElementById('text-clean');

  const transformText = (fn) => {
    if (!textInput || !textOutput) return;
    textOutput.value = fn(textInput.value || '');
  };

  if (textUpper) textUpper.addEventListener('click', () => transformText((value) => value.toUpperCase()));
  if (textLower) textLower.addEventListener('click', () => transformText((value) => value.toLowerCase()));
  if (textTitle) {
    textTitle.addEventListener('click', () => transformText((value) =>
      value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
    ));
  }
  if (textClean) {
    textClean.addEventListener('click', () => transformText((value) =>
      value.replace(/\s+/g, ' ').trim()
    ));
  }

  const tempInput = document.getElementById('temp-input');
  const tempResult = document.getElementById('temp-result');
  const tempCF = document.getElementById('temp-cf');
  const tempFC = document.getElementById('temp-fc');

  if (tempCF && tempInput && tempResult) {
    tempCF.addEventListener('click', () => {
      const value = parseFloat(tempInput.value || '0');
      const result = (value * 9 / 5) + 32;
      tempResult.textContent = `Result: ${result.toFixed(1)} F`;
    });
  }

  if (tempFC && tempInput && tempResult) {
    tempFC.addEventListener('click', () => {
      const value = parseFloat(tempInput.value || '0');
      const result = (value - 32) * 5 / 9;
      tempResult.textContent = `Result: ${result.toFixed(1)} C`;
    });
  }
}

const MUSIC_PLAYLIST = [
  { file: './assets/audios/World\'s Number One Oden Store.mp3', title: 'World\'s Number One Oden Store', cover: './assets/audios/World\'s Number One Oden Store.png' },
  { file: './assets/audios/Wet.mp3', title: 'Wet', cover: './assets/audios/Wet.png' },
  { file: './assets/audios/No One Ever Said.mp3', title: 'No One Ever Said', cover: './assets/audios/No One Ever Said.png' },
  { file: './assets/audios/Rises The Moon.mp3', title: 'Rises The Moon', cover: './assets/audios/Rises The Moon.png' },
  { file: './assets/audios/Sorry, I Like You.mp3', title: 'Sorry, I Like You', cover: './assets/audios/Sorry, I Like You.png' }
];
const MUSIC_FALLBACK_COVER = './assets/Peak.png';

function getSavedMusicVolume() {
  const raw = parseFloat(localStorage.getItem('music-volume') || '0.1');
  if (!Number.isFinite(raw)) return 0.1;
  if (raw > 1) return Math.min(raw / 100, 1);
  return Math.max(raw, 0);
}

function setupRightWidgetControls() {
  const widgetsRoot = document.querySelector('.right-widgets');
  if (!widgetsRoot) return;

  const player = window.musicPlayer || null;
  const audio = player ? player.audio : document.getElementById('bg-music');
  const musicCover = document.getElementById('music-cover');
  const musicTitle = document.getElementById('music-title');
  const centerToggle = document.getElementById('music-center-toggle');
  const skipPrevBtn = document.getElementById('music-skip-prev');
  const skipNextBtn = document.getElementById('music-skip-next');
  const progressTrack = document.getElementById('music-progress-compact');
  const volumeSlider = document.getElementById('options-volume-slider');
  const themeButtons = document.querySelectorAll('.theme-btn');
  const simpleUiToggle = document.getElementById('simple-ui-toggle');
  const stickyShareBtn = document.getElementById('sticky-copy');
  const shareState = { title: document.title, url: window.location.href };

  const applyMusicState = (state) => {
    if (!musicCover || !musicTitle || !centerToggle || !skipPrevBtn || !skipNextBtn) return;

    const hasError = !state || state.hasError;
    const isPlaying = Boolean(state && state.isPlaying);
    const trackTitle = hasError
      ? 'Audio unavailable'
      : (state && state.track ? state.track.title : 'Loading track...');
    const trackCover = hasError
      ? MUSIC_FALLBACK_COVER
      : (state && state.cover ? state.cover : MUSIC_FALLBACK_COVER);
    const progress = state && Number.isFinite(state.progressPercent) ? state.progressPercent : 0;

    musicTitle.textContent = trackTitle;
    musicTitle.title = trackTitle;
    musicCover.style.backgroundImage = `url("${trackCover}")`;
    musicCover.classList.toggle('is-playing', isPlaying);
    musicCover.classList.toggle('has-error', hasError);

    centerToggle.setAttribute('aria-label', isPlaying ? 'Pause music' : 'Play music');
    centerToggle.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');

    const disableControls = hasError || !player;
    centerToggle.disabled = disableControls;
    skipPrevBtn.disabled = disableControls;
    skipNextBtn.disabled = disableControls;

    if (progressTrack) {
      progressTrack.value = String(progress);
      progressTrack.setAttribute('aria-valuenow', String(Math.round(progress)));
      progressTrack.disabled = hasError;
    }
  };

  if (centerToggle && player) {
    centerToggle.addEventListener('click', () => {
      player.toggle();
    });
  }

  if (skipPrevBtn && player) {
    skipPrevBtn.addEventListener('click', () => {
      player.prev();
    });
  }

  if (skipNextBtn && player) {
    skipNextBtn.addEventListener('click', () => {
      player.next();
    });
  }

  if (volumeSlider) {
    const currentVolume = player ? player.getState().volumePercent : Math.round((audio ? audio.volume : getSavedMusicVolume()) * 100);
    volumeSlider.value = String(currentVolume);

    volumeSlider.addEventListener('input', (e) => {
      const percentValue = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
      if (player) {
        player.setVolumePercent(percentValue);
      } else if (audio) {
        const volume = percentValue / 100;
        audio.volume = volume;
        localStorage.setItem('music-volume', volume.toString());
      }
    });
  }

  if (progressTrack && player) {
    const seekTrack = () => {
      const state = player.getState();
      if (!state || !state.duration || !Number.isFinite(state.duration)) return;
      const percentValue = Math.max(0, Math.min(100, parseFloat(progressTrack.value) || 0));
      player.audio.currentTime = (percentValue / 100) * state.duration;
    };
    progressTrack.addEventListener('input', seekTrack);
    progressTrack.addEventListener('change', seekTrack);
  }

  if (themeButtons.length) {
    const selectThemeButton = (themeValue) => {
      themeButtons.forEach((btn) => {
        const isActive = btn.dataset.theme === themeValue;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    };

    themeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme || 'default';
        applyTheme(theme);
        localStorage.setItem('theme', theme);
        selectThemeButton(theme);
      });
    });

    const savedTheme = localStorage.getItem('theme') || 'default';
    applyTheme(savedTheme);
    selectThemeButton(savedTheme);
  }

  if (simpleUiToggle) {
    simpleUiToggle.addEventListener('click', () => {
      setSimpleUi(!document.body.classList.contains('simple-ui'));
    });
    updateSimpleUiToggle(document.body.classList.contains('simple-ui'));
  }

  const shareCurrentLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: shareState.title, url: shareState.url });
        if (window.showToast) window.showToast('Shared');
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareState.url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareState.url;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!copied) {
          throw new Error('execCommand copy failed');
        }
      }
      if (window.showToast) window.showToast('Link copied');
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      console.error('Failed to share link:', error);
      if (window.showToast) window.showToast('Share failed');
    }
  };
  window.shareCurrentLink = shareCurrentLink;
  window.copyCurrentShareLink = shareCurrentLink;

  if (stickyShareBtn) {
    stickyShareBtn.addEventListener('click', shareCurrentLink);
  }

  window.setShareContext = ({ title, url }) => {
    shareState.title = title || document.title;
    shareState.url = url || window.location.href;
    if (stickyShareBtn) {
      const label = title ? `Share "${title}"` : 'Share post link';
      stickyShareBtn.setAttribute('aria-label', label);
      stickyShareBtn.title = label;
    }
  };

  if (window.__pendingShareContext) {
    window.setShareContext(window.__pendingShareContext);
    delete window.__pendingShareContext;
  }

  if (player) {
    player.subscribe((state) => {
      applyMusicState(state);
      if (volumeSlider) {
        volumeSlider.value = String(state.volumePercent);
      }
    });
  } else {
    applyMusicState(null);
  }
}

const REACTIONS_CONFIG = {
  backend: 'auto', // auto | supabase | local
  supabaseUrl: 'https://xvrrmphwymqnsabgvaow.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cnJtcGh3eW1xbnNhYmd2YW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTg1NTIsImV4cCI6MjA4NTk3NDU1Mn0.N0rdWIf1OoTQPm3GqhRc1D1GMtUATCI4tETolkAvAFE',
  supabaseTable: 'post_reactions'
};

const reactionState = {
  slug: '',
  likes: 0,
  dislikes: 0,
  userReaction: '',
  pending: false,
  requestId: 0
};

function getReactionsBackend() {
  if (REACTIONS_CONFIG.backend === 'supabase') return 'supabase';
  if (REACTIONS_CONFIG.backend === 'local') return 'local';
  return (REACTIONS_CONFIG.supabaseUrl && REACTIONS_CONFIG.supabaseAnonKey) ? 'supabase' : 'local';
}

function getReactionLocalKey(slug) {
  return `post-reactions::${slug}`;
}

function getUserReactionKey(slug) {
  return `post-reaction::${slug}`;
}

function loadLocalReactions(slug) {
  const stored = localStorage.getItem(getReactionLocalKey(slug));
  if (!stored) return { likes: 0, dislikes: 0 };
  try {
    const parsed = JSON.parse(stored);
    return {
      likes: Number(parsed.likes) || 0,
      dislikes: Number(parsed.dislikes) || 0
    };
  } catch {
    return { likes: 0, dislikes: 0 };
  }
}

function saveLocalReactions(slug, data) {
  localStorage.setItem(getReactionLocalKey(slug), JSON.stringify({
    likes: Number(data.likes) || 0,
    dislikes: Number(data.dislikes) || 0
  }));
}

async function fetchSupabaseReactions(slug) {
  const baseUrl = REACTIONS_CONFIG.supabaseUrl.replace(/\/$/, '');
  const table = REACTIONS_CONFIG.supabaseTable;
  const url = `${baseUrl}/rest/v1/${table}?post_slug=eq.${encodeURIComponent(slug)}&select=post_slug,likes,dislikes&limit=1`;

  const response = await fetch(url, {
    headers: {
      apikey: REACTIONS_CONFIG.supabaseAnonKey,
      Authorization: `Bearer ${REACTIONS_CONFIG.supabaseAnonKey}`
    }
  });

  if (!response.ok) {
    console.error('Failed to load reactions:', await response.text());
    return null;
  }

  const data = await response.json();
  return data && data[0] ? data[0] : null;
}

async function upsertSupabaseReactions(slug, likes, dislikes) {
  const baseUrl = REACTIONS_CONFIG.supabaseUrl.replace(/\/$/, '');
  const table = REACTIONS_CONFIG.supabaseTable;
  const url = `${baseUrl}/rest/v1/${table}?post_slug=eq.${encodeURIComponent(slug)}`;
  const payload = { post_slug: slug, likes, dislikes };

  const existing = await fetchSupabaseReactions(slug);
  if (existing) {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        apikey: REACTIONS_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${REACTIONS_CONFIG.supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error('Failed to update reactions:', await response.text());
      return false;
    }
    return true;
  }

  const createResponse = await fetch(`${baseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: REACTIONS_CONFIG.supabaseAnonKey,
      Authorization: `Bearer ${REACTIONS_CONFIG.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(payload)
  });

  if (!createResponse.ok) {
    console.error('Failed to create reactions:', await createResponse.text());
  }
  return createResponse.ok;
}

function updateReactionUI() {
  const likeBtn = document.getElementById('sticky-like');
  const dislikeBtn = document.getElementById('sticky-dislike');
  if (!likeBtn || !dislikeBtn) return;

  const likeCount = likeBtn.querySelector('[data-reaction-count="like"]');
  const dislikeCount = dislikeBtn.querySelector('[data-reaction-count="dislike"]');

  if (likeCount) likeCount.textContent = String(reactionState.likes);
  if (dislikeCount) dislikeCount.textContent = String(reactionState.dislikes);

  likeBtn.classList.toggle('is-active', reactionState.userReaction === 'like');
  dislikeBtn.classList.toggle('is-active', reactionState.userReaction === 'dislike');

  likeBtn.setAttribute('aria-label', `Like post (${reactionState.likes})`);
  dislikeBtn.setAttribute('aria-label', `Dislike post (${reactionState.dislikes})`);
}

async function loadReactionsForSlug(slug) {
  if (!slug) return;
  const backend = getReactionsBackend();
  if (backend === 'supabase') {
    const data = await fetchSupabaseReactions(slug);
    return data ? { likes: Number(data.likes) || 0, dislikes: Number(data.dislikes) || 0 } : { likes: 0, dislikes: 0 };
  }
  return loadLocalReactions(slug);
}

async function updateReactionsForSlug(slug, deltaLikes, deltaDislikes) {
  if (!slug) return false;

  const backend = getReactionsBackend();
  const current = backend === 'supabase'
    ? await fetchSupabaseReactions(slug)
    : loadLocalReactions(slug);
  const baseLikes = current ? Number(current.likes) || 0 : 0;
  const baseDislikes = current ? Number(current.dislikes) || 0 : 0;
  const nextLikes = Math.max(0, baseLikes + deltaLikes);
  const nextDislikes = Math.max(0, baseDislikes + deltaDislikes);

  saveLocalReactions(slug, { likes: nextLikes, dislikes: nextDislikes });

  if (backend === 'supabase') {
    return upsertSupabaseReactions(slug, nextLikes, nextDislikes);
  }
  return true;
}

function setReactionContext(slug = '') {
  reactionState.slug = slug || '';
  reactionState.userReaction = reactionState.slug
    ? (localStorage.getItem(getUserReactionKey(reactionState.slug)) || '')
    : '';
  reactionState.likes = 0;
  reactionState.dislikes = 0;
  updateReactionUI();

  if (!reactionState.slug) return;

  const requestId = ++reactionState.requestId;
  loadReactionsForSlug(reactionState.slug).then((data) => {
    if (reactionState.requestId !== requestId) return;
    reactionState.likes = data.likes;
    reactionState.dislikes = data.dislikes;
    updateReactionUI();
  });
}

function handleReaction(type) {
  if (!reactionState.slug || reactionState.pending) return;
  const prev = reactionState.userReaction;
  if (prev === type) {
    if (window.showToast) window.showToast('Already set');
    return;
  }

  let deltaLikes = 0;
  let deltaDislikes = 0;
  if (prev === 'like') deltaLikes -= 1;
  if (prev === 'dislike') deltaDislikes -= 1;
  if (type === 'like') deltaLikes += 1;
  if (type === 'dislike') deltaDislikes += 1;

  reactionState.likes = Math.max(0, reactionState.likes + deltaLikes);
  reactionState.dislikes = Math.max(0, reactionState.dislikes + deltaDislikes);
  reactionState.userReaction = type;
  if (reactionState.slug) {
    localStorage.setItem(getUserReactionKey(reactionState.slug), type);
  }
  updateReactionUI();

  reactionState.pending = true;
  updateReactionsForSlug(reactionState.slug, deltaLikes, deltaDislikes)
    .catch((error) => {
      console.error('Failed to sync reaction:', error);
      if (window.showToast) window.showToast('Sync failed');
    })
    .finally(() => {
      reactionState.pending = false;
    });
}

function setupPostReactions() {
  const likeBtn = document.getElementById('sticky-like');
  const dislikeBtn = document.getElementById('sticky-dislike');
  if (!likeBtn || !dislikeBtn) return;
  if (likeBtn.dataset.bound === 'true') return;

  likeBtn.addEventListener('click', () => handleReaction('like'));
  dislikeBtn.addEventListener('click', () => handleReaction('dislike'));
  likeBtn.dataset.bound = 'true';
  dislikeBtn.dataset.bound = 'true';
  updateReactionUI();
}

window.setReactionContext = setReactionContext;
window.setupPostReactions = setupPostReactions;

function shouldEnableViewer(img) {
  if (!img || !img.src) return false;
  if (img.dataset.noViewer === 'true') return false;
  if (img.closest('.media-card')) return false;
  if (img.closest('.project-album-item')) return false;
  if (img.closest('.project-related-item')) return false;
  if (img.closest('.logo-container')) return false;
  if (img.classList.contains('media-card-avatar')) return false;
  if (img.classList.contains('project-profile-logo')) return false;
  return true;
}

function openImageViewerFrom(img) {
  const src = img.currentSrc || img.src;
  if (!src) return;
  const alt = img.alt || 'Image preview';
  const payload = [{ src, alt, caption: alt }];
  const openLightbox = window.openProjectAlbumLightbox || (typeof openProjectAlbumLightbox === 'function' ? openProjectAlbumLightbox : null);
  if (openLightbox) {
    openLightbox(payload, 0);
    return;
  }
  window.open(src, '_blank', 'noopener');
}

function registerViewerImages(root = document) {
  if (!root) return;
  const images = root.querySelectorAll('img');
  images.forEach((img) => {
    if (img.dataset.viewerBound === 'true') return;
    if (!shouldEnableViewer(img)) return;
    img.dataset.viewerBound = 'true';
    img.classList.add('viewer-image');
    img.setAttribute('draggable', 'false');
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `Open image: ${img.alt || 'preview'}`);
    img.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openImageViewerFrom(img);
    });
    img.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openImageViewerFrom(img);
      }
    });
  });
}

window.registerViewerImages = registerViewerImages;

// Initialize DOMContentLoaded event handlers
document.addEventListener('DOMContentLoaded', () => {
  updateActiveNavLink();
  initSimpleUiPreference();
  setupHeaderScrollState();
  setupTopNavigation();
  setupGlobalShortcuts();
  if (typeof window.setupToolsDashboard === 'function') {
    window.setupToolsDashboard();
  }
  setupMusicPlayer();
  setupRightWidgetControls();
  setupReadingProgress();
  setupPostReactions();
  registerViewerImages(document);
});

// Music player setup
function setupMusicPlayer() {
  const audio = document.getElementById('bg-music');
  const navbarTrackNameDisplay = document.getElementById('navbar-track-name');
  if (!audio) return;

  audio.loop = true;
  audio.preload = 'metadata';
  audio.volume = getSavedMusicVolume();

  const listeners = new Set();
  const storedTrackIndex = parseInt(localStorage.getItem('current-track-index') || '0', 10);
  let currentTrackIndex = Number.isInteger(storedTrackIndex) ? storedTrackIndex : 0;
  if (currentTrackIndex < 0 || currentTrackIndex >= MUSIC_PLAYLIST.length) {
    currentTrackIndex = 0;
  }

  let hasError = false;
  let restoreTimeOnce = true;

  const getTrack = () => MUSIC_PLAYLIST[currentTrackIndex] || MUSIC_PLAYLIST[0];

  const getState = () => ({
    audio,
    playlist: MUSIC_PLAYLIST,
    trackIndex: currentTrackIndex,
    track: getTrack(),
    isPlaying: !audio.paused,
    hasError,
    volume: audio.volume,
    volumePercent: Math.round(audio.volume * 100),
    currentTime: audio.currentTime || 0,
    duration: Number.isFinite(audio.duration) ? audio.duration : 0,
    progressPercent: Number.isFinite(audio.duration) && audio.duration > 0
      ? Math.min(100, Math.max(0, (audio.currentTime / audio.duration) * 100))
      : 0,
    cover: hasError ? MUSIC_FALLBACK_COVER : (getTrack().cover || MUSIC_FALLBACK_COVER)
  });

  const emitState = () => {
    const state = getState();
    if (navbarTrackNameDisplay) {
      navbarTrackNameDisplay.textContent = state.track ? state.track.title : 'No track';
    }
    listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('Music state listener failed:', error);
      }
    });
  };

  const play = async () => {
    if (hasError) return false;
    try {
      await audio.play();
      localStorage.setItem('music-playing', 'yes');
      emitState();
      return true;
    } catch (error) {
      localStorage.setItem('music-playing', 'no');
      emitState();
      return false;
    }
  };

  const pause = () => {
    audio.pause();
    localStorage.setItem('music-playing', 'no');
    emitState();
  };

  const setTrack = (index, options = {}) => {
    const normalizedIndex = ((index % MUSIC_PLAYLIST.length) + MUSIC_PLAYLIST.length) % MUSIC_PLAYLIST.length;
    const shouldResume = Boolean(options.resume);
    const keepSavedTime = Boolean(options.keepSavedTime);

    currentTrackIndex = normalizedIndex;
    hasError = false;
    audio.src = getTrack().file;
    audio.load();
    localStorage.setItem('current-track-index', String(currentTrackIndex));
    if (!keepSavedTime) {
      localStorage.setItem('music-time', '0');
      restoreTimeOnce = false;
    }
    emitState();

    if (shouldResume) {
      play();
    }
  };

  const next = () => setTrack(currentTrackIndex + 1, { resume: !audio.paused });
  const prev = () => setTrack(currentTrackIndex - 1, { resume: !audio.paused });
  const toggle = () => (audio.paused ? play() : pause());
  const setVolumePercent = (percentValue) => {
    const safePercent = Math.max(0, Math.min(100, Number(percentValue) || 0));
    audio.volume = safePercent / 100;
    localStorage.setItem('music-volume', audio.volume.toString());
    emitState();
  };

  window.musicPlayer = {
    audio,
    play,
    pause,
    toggle,
    next,
    prev,
    setTrack,
    setVolumePercent,
    getState,
    getCurrentTrackIndex: () => currentTrackIndex,
    getPlaylist: () => MUSIC_PLAYLIST.slice(),
    subscribe: (listener) => {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    }
  };

  window.getPlaylist = () => MUSIC_PLAYLIST.slice();
  window.getCurrentTrackIndex = () => currentTrackIndex;
  window.setPlaylistTrack = (index) => setTrack(index, { resume: !audio.paused });
  window.fadeIn = () => play();
  window.fadeOut = (callback) => {
    pause();
    if (typeof callback === 'function') callback();
  };

  audio.addEventListener('timeupdate', () => {
    localStorage.setItem('music-time', audio.currentTime.toString());
    emitState();
  });

  audio.addEventListener('loadedmetadata', () => {
    if (restoreTimeOnce) {
      const savedTime = parseFloat(localStorage.getItem('music-time') || '0');
      if (Number.isFinite(savedTime) && savedTime > 0 && savedTime < audio.duration) {
        audio.currentTime = savedTime;
      }
      restoreTimeOnce = false;
    }
    emitState();
  });

  audio.addEventListener('play', () => {
    localStorage.setItem('music-playing', 'yes');
    emitState();
  });

  audio.addEventListener('pause', () => {
    localStorage.setItem('music-playing', 'no');
    emitState();
  });

  audio.addEventListener('canplay', () => {
    hasError = false;
    emitState();
  });

  audio.addEventListener('error', () => {
    hasError = true;
    localStorage.setItem('music-playing', 'no');
    emitState();
  });

  setTrack(currentTrackIndex, { keepSavedTime: true });

  if (localStorage.getItem('music-playing') === 'yes') {
    const tryResumeOnGesture = () => {
      play().catch(() => {});
    };
    document.addEventListener('pointerdown', tryResumeOnGesture, { once: true, passive: true });
    document.addEventListener('keydown', tryResumeOnGesture, { once: true });
  }
}

// Options Modal Setup
function setupOptionsModal() {
  const optionsToggle = document.getElementById('options-toggle');
  const optionsModal = document.getElementById('options-modal');
  const optionsClose = document.getElementById('options-close');
  const themeButtons = document.querySelectorAll('.theme-btn');
  const simpleUiToggles = document.querySelectorAll('.simple-ui-toggle');
  const audio = document.getElementById('bg-music');
  const musicTitle = document.getElementById('music-title');
  const musicCardStatus = document.getElementById('music-card-status');
  const musicCurrent = document.getElementById('music-current');
  const musicTotal = document.getElementById('music-total');
  const musicProgress = document.getElementById('music-progress');
  const musicControlsBox = document.querySelector('.music-controls-box');
  const musicCover = document.getElementById('music-cover');
  const optionsMusicToggle = document.getElementById('options-music-toggle');
  const optionsVolumeSlider = document.getElementById('options-volume-slider');
  const skipPrevBtn = document.getElementById('music-skip-prev');
  const skipNextBtn = document.getElementById('music-skip-next');
  const playlistSelector = document.getElementById('playlist-selector');

  if (!optionsModal) return;

  // Initialize playlist buttons
  const playlist = window.getPlaylist ? window.getPlaylist() : [];
  if (playlistSelector && playlist.length > 0) {
    playlistSelector.innerHTML = '<label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; display: block; grid-column: 1 / -1;">Playlist</label>';
    const currentIdx = window.getCurrentTrackIndex ? window.getCurrentTrackIndex() : 0;
    playlist.forEach((track, index) => {
      const btn = document.createElement('button');
      btn.className = 'playlist-btn' + (index === currentIdx ? ' active' : '');
      btn.textContent = `${index + 1}`;
      btn.title = track.title;
      btn.addEventListener('click', () => {
        if (window.setPlaylistTrack) {
          window.setPlaylistTrack(index);
          updatePlaylistButtons();
          updateMusicDisplay();

          // If music is enabled or already playing, try to start playback of the selected track
          if (audio) {
            try {
              if (!audio.paused) {
                audio.play().catch(()=>{});
              } else if (localStorage.getItem('music-enabled') === 'yes') {
                // Fade in for nicer UX
                if (window.fadeIn) window.fadeIn();
              }
            } catch (e) {
              console.warn('Could not start audio playback:', e);
            }
          }
        }
      });
      playlistSelector.appendChild(btn);
    });
  }

  const updatePlaylistButtons = () => {
    const buttons = document.querySelectorAll('.playlist-btn');
    const currentIdx = window.getCurrentTrackIndex ? window.getCurrentTrackIndex() : 0;
    buttons.forEach((btn, idx) => {
      if (idx === currentIdx) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  };

  // Skip buttons
  if (skipPrevBtn) {
    skipPrevBtn.addEventListener('click', () => {
      const currentIdx = window.getCurrentTrackIndex ? window.getCurrentTrackIndex() : 0;
      const playlistLen = playlist.length || 1;
      const newIdx = (currentIdx - 1 + playlistLen) % playlistLen;
      if (window.setPlaylistTrack) {
        window.setPlaylistTrack(newIdx);
        updatePlaylistButtons();
        updateMusicDisplay();
        if (audio && window.fadeIn) window.fadeIn();
      }
    });
  }

  if (skipNextBtn) {
    skipNextBtn.addEventListener('click', () => {
      const currentIdx = window.getCurrentTrackIndex ? window.getCurrentTrackIndex() : 0;
      const playlistLen = playlist.length;
      if (window.setPlaylistTrack) {
        window.setPlaylistTrack((currentIdx + 1) % playlistLen);
        updatePlaylistButtons();
        updateMusicDisplay();
        if (audio && window.fadeIn) window.fadeIn();
      }
    });
  }

  // Open options modal (if toggle exists)
  if (optionsToggle) {
    optionsToggle.addEventListener('click', () => {
      optionsModal.classList.add('open');
      updateMusicDisplay();
      updatePlaylistButtons();
      // Sync volume sliders
      if (audio && optionsVolumeSlider) {
        optionsVolumeSlider.value = audio.volume;
      }
    });
  }

  // Close options modal (if close button exists)
  if (optionsClose) {
    optionsClose.addEventListener('click', () => {
      optionsModal.classList.remove('open');
    });
  }

  // Close modal when clicking outside
  optionsModal.addEventListener('click', (e) => {
    if (e.target === optionsModal) {
      optionsModal.classList.remove('open');
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && optionsModal.classList.contains('open')) {
      optionsModal.classList.remove('open');
    }
  });

  if (simpleUiToggles.length) {
    updateSimpleUiToggle(document.body.classList.contains('simple-ui'));
    simpleUiToggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        setSimpleUi(!document.body.classList.contains('simple-ui'));
      });
    });
  }

  // Play/pause toggle button
  if (optionsMusicToggle && audio) {
    optionsMusicToggle.addEventListener('click', () => {
      if (audio.paused) {
        fadeIn();
      } else {
        fadeOut();
      }
      updateMusicButtonState();
    });
  }

  if (musicCover && audio) {
    musicCover.addEventListener('click', () => {
      if (audio.paused) {
        fadeIn();
      } else {
        fadeOut();
      }
      updateMusicButtonState();
    });
  }

  // Options volume slider
  if (optionsVolumeSlider && audio) {
    optionsVolumeSlider.addEventListener('input', (e) => {
      const volume = parseFloat(e.target.value);
      audio.volume = volume;
      localStorage.setItem('music-volume', volume.toString());
    });
  }

  // Theme switching
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      
      // Remove active class from all buttons
      themeButtons.forEach(b => b.classList.remove('active'));
      
      // Add active class to clicked button
      btn.classList.add('active');
      
      // Apply theme
      applyTheme(theme);
      
      // Save theme preference
      localStorage.setItem('theme', theme);
    });
  });

  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'default';
  const savedThemeBtn = document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`);
  if (savedThemeBtn) {
    themeButtons.forEach(b => b.classList.remove('active'));
    savedThemeBtn.classList.add('active');
    if (savedTheme !== 'default') {
      applyTheme(savedTheme);
    }
  }

  // Update music display
  function updateMusicDisplay() {
    if (!audio || !musicTitle) return;
    
    // Get current track from playlist
    const playlist = window.getPlaylist ? window.getPlaylist() : [];
    const currentIdx = window.getCurrentTrackIndex ? window.getCurrentTrackIndex() : 0;
    const track = playlist[currentIdx];
    const trackTitle = track ? track.title : 'Loading...';
    
    musicTitle.textContent = trackTitle;
    if (musicCardStatus) {
      musicCardStatus.textContent = trackTitle;
    }
    if (musicCover) {
      if (track && track.file) {
        const coverFromFile = track.file.replace(/\.mp3$/i, '.png');
        musicCover.style.backgroundImage = `url("${coverFromFile}")`;
      } else {
        musicCover.style.backgroundImage = '';
      }
    }

    // Update progress
    if (musicProgress && audio.duration) {
      musicProgress.value = (audio.currentTime / audio.duration) * 100;
      const minutes = Math.floor(audio.currentTime / 60);
      const seconds = Math.floor(audio.currentTime % 60);
      const totalMinutes = Math.floor(audio.duration / 60);
      const totalSeconds = Math.floor(audio.duration % 60);
      if (musicCurrent) {
        musicCurrent.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      if (musicTotal) {
        musicTotal.textContent = `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
      }
    }
  }

  // Update music button state
  function updateMusicButtonState() {
    if (!audio) return;
    if (audio.paused) {
      if (musicControlsBox) musicControlsBox.classList.remove('playing');
      if (musicCover) musicCover.classList.remove('playing');
      if (optionsMusicToggle) optionsMusicToggle.innerHTML = '<i class="fas fa-play"></i>';
    } else {
      if (musicControlsBox) musicControlsBox.classList.add('playing');
      if (musicCover) musicCover.classList.add('playing');
      if (optionsMusicToggle) optionsMusicToggle.innerHTML = '<i class="fas fa-pause"></i>';
    }
  }

  // Update music display on time change
  if (audio) {
    audio.addEventListener('timeupdate', updateMusicDisplay);
    audio.addEventListener('play', updateMusicButtonState);
    audio.addEventListener('pause', updateMusicButtonState);
  }

  // Handle progress bar click
  if (musicProgress && audio) {
    musicProgress.addEventListener('input', (e) => {
      const percent = e.target.value / 100;
      audio.currentTime = percent * audio.duration;
    });
  }
}

// Apply theme
function applyTheme(theme) {
  if (theme === 'default') {
    document.body.classList.remove('theme-blue', 'theme-purple', 'theme-green', 'theme-red', 'theme-rgb');
  } else {
    document.body.classList.remove('theme-blue', 'theme-purple', 'theme-green', 'theme-red', 'theme-rgb');
    document.body.classList.add(`theme-${theme}`);
  }
}

// Initialize options modal on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setupOptionsModal();
  initializeEasterEggs();
  setupReadingProgress();
});

// Easter Eggs and Hidden Features
function initializeEasterEggs() {
  // Konami code easter egg (up, up, down, down, left, right, left, right, b, a)
  const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIndex = 0;

  document.addEventListener('keydown', (e) => {
    const key = e.key === 'b' || e.key === 'a' ? e.key : e.code;
    
    if (key === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        activateKonamiEasterEgg();
        konamiIndex = 0;
      }
    } else {
      konamiIndex = 0;
    }
  });

  // Triple-click hero avatar for surprise
  const heroAvatar = document.querySelector('.hero-avatar');
  if (heroAvatar) {
    let clickCount = 0;
    let clickTimer;
    
    heroAvatar.addEventListener('click', () => {
      clickCount++;
      clearTimeout(clickTimer);
      
      if (clickCount === 3) {
        activateAvatarEasterEgg();
        clickCount = 0;
      }
      
      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 500);
    });
  }

  // Secret keyboard command: press 'v' + 'd' within 1 second for dev console messages
  let vPressed = false;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'v' || e.key === 'V') {
      vPressed = true;
      setTimeout(() => { vPressed = false; }, 1000);
    }
    
    if ((e.key === 'd' || e.key === 'D') && vPressed) {
      console.log('%c🎮 DEVELOPER MODE ACTIVATED 🎮', 'color: #ff0080; font-size: 16px; font-weight: bold;');
      console.log('%cThanks for checking the source code! You have great taste.', 'color: #00ffff; font-size: 12px;');
      console.log('%cHere are some tips:', 'color: #ff00ff; font-size: 12px;');
      console.log('• Try the Konami code: ↑ ↑ ↓ ↓ ← → ← → B A');
      console.log('• Triple-click the avatar');
      console.log('• RGB theme option is available in settings');
      vPressed = false;
    }
  });

  // Click on page title multiple times for achievement
  const pageTitle = document.querySelector('h1');
  if (pageTitle) {
    let titleClicks = 0;
    pageTitle.style.cursor = 'pointer';
    pageTitle.addEventListener('click', () => {
      titleClicks++;
      pageTitle.style.transition = 'transform 0.1s';
      pageTitle.style.transform = `rotate(${titleClicks * 5}deg) scale(${1 + titleClicks * 0.02})`;
      
      if (titleClicks === 10) {
        console.log('%c✨ Achievement Unlocked: Spinner ✨', 'color: #ffff00; font-size: 14px; font-weight: bold;');
        pageTitle.style.animation = 'spin 2s linear';
        titleClicks = 0;
      }
    });
  }
}



// Reading Progress Indicator
function setupReadingProgress() {
  const progressBar = document.getElementById('reading-progress');
  
  if (!progressBar) return;

  window.addEventListener('scroll', () => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    
    // Calculate progress (0 to 100)
    const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
    
    progressBar.style.width = Math.min(scrollPercent, 100) + '%';
  });
}
