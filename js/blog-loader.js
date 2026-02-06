// blog-loader.js - Blog Loader & Logic
// NO MODULE EXPORTS - Using global scope for compatibility
// Requires: utils.js, markdown-parser.js to be loaded first

// Manifest of all blog posts
const POST_MANIFEST = [
  'Markdowntest.md',
  'NomuSite.md',
  'MAIV1.md',
  'SUpdate1.md',
  'Pornban.md',
  'SUpdate2.md',
  'SUpdate3.md',
];


let allPosts = [];
let filteredPosts = [];
let currentCategory = 'all';
let currentSearchQuery = '';
let currentPage = 1;
let searchHistory = [];
const postsPerPage = 4;

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

// Load all posts from markdown files
async function loadPosts() {
  if (allPosts.length > 0) {
    return allPosts;
  }
  
  const posts = [];
  
  for (const filename of POST_MANIFEST) {
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
      
      // Construct post object
      const post = {
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

// Render post cards in list view with pagination
function renderPostsList(posts, page = 1) {
  const container = document.getElementById('posts-list');
  
  if (!container) {
    console.error('posts-list container not found');
    return;
  }
  
  if (posts.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No posts found.</p>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(posts.length / postsPerPage);
  const startIndex = (page - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const postsToShow = posts.slice(startIndex, endIndex);
  
  container.innerHTML = postsToShow.map((post, index) => `
    <article class="post-card" style="background-image: url('${post.cover}'); background-size: cover; background-position: center; animation-delay: ${index * 0.05}s;" onclick="showSinglePost('${post.slug}'); return false;">
      <div class="post-card-content">
        <h3><a href="#" onclick="event.stopPropagation(); showSinglePost('${post.slug}'); return false;">${post.title}</a></h3>
        <div class="post-meta">
          <span>${formatDate(post.date)}</span>
          <span>•</span>
          <span>${formatCategory(post.category)}</span>
          <span>•</span>
          <span>${post.readTime} min read</span>
        </div>
        <p class="post-excerpt">${post.excerpt}</p>
        <a href="#" onclick="event.stopPropagation(); showSinglePost('${post.slug}'); return false;" class="read-more">Read more</a>
      </div>
      <img src="${post.cover}" alt="${post.title}" class="post-thumb" onerror="this.style.display='none'">
    </article>
  `).join('');
  
  // Setup featured post (only on first page)
  if (allPosts.length > 0 && currentPage === 1) {
    setupFeaturedPost(allPosts[0]);
  }
  
  // Render pagination
  renderPagination(totalPages, page);
  
  // Scroll to search bar area after content is rendered
  const searchBar = document.querySelector('.search-bar');
  if (searchBar) {
    searchBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
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

// Render pagination controls
function renderPagination(totalPages, currentPage) {
  const paginationContainer = document.getElementById('pagination');
  
  if (!paginationContainer) {
    console.error('pagination container not found');
    return;
  }
  
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }
  
  let paginationHTML = '<div class="pagination-controls">';
  
  // Previous button
  if (currentPage > 1) {
    paginationHTML += `<button class="pagination-btn" onclick="changePage(${currentPage - 1})">← Previous</button>`;
  }
  
  // Page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  if (startPage > 1) {
    paginationHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += '<span class="pagination-ellipsis">...</span>';
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const activeClass = i === currentPage ? ' active' : '';
    paginationHTML += `<button class="pagination-btn${activeClass}" onclick="changePage(${i})">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += '<span class="pagination-ellipsis">...</span>';
    }
    paginationHTML += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
  }
  
  // Next button
  if (currentPage < totalPages) {
    paginationHTML += `<button class="pagination-btn" onclick="changePage(${currentPage + 1})">Next →</button>`;
  }
  
  // Page jump input
  paginationHTML += `
    <div class="page-jump">
      <span>Go to page:</span>
      <input type="number" id="page-input" min="1" max="${totalPages}" value="${currentPage}" onchange="jumpToPage(this.value)">
      <span>of ${totalPages}</span>
    </div>
  `;
  
  paginationHTML += '</div>';
  paginationContainer.innerHTML = paginationHTML;
}

// Show single post view
function showSinglePost(slug) {
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
    if (heroSection) heroSection.style.display = 'none';
    blogSection.style.display = 'none';
    singleView.style.display = 'block';
    if (featuredSection) {
      featuredSection.style.display = 'none';
    }
    
    renderSinglePost(slug);
    setupCommentForm();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Hide loading screen
    if (pageLoader) {
      pageLoader.classList.add('hidden');
    }
  }, 300);
  
  // Update URL without reloading
  history.pushState({ post: slug }, '', `?post=${slug}`);
}

// Hide single post view and show blog list
function hideSinglePost() {
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
    if (heroSection) heroSection.style.display = 'block';
    blogSection.style.display = 'block';
    singleView.style.display = 'none';
    if (featuredSection) {
      featuredSection.style.display = 'block';
      // Reset featured post data when returning from single post
      setupFeaturedPost(allPosts.length > 0 ? allPosts[0] : null);
    }
    
    // Hide TOC sidebar
    const tocSidebar = document.getElementById('toc-sidebar');
    if (tocSidebar) {
      tocSidebar.classList.remove('open');
    }
    
    // Update URL
    history.pushState({}, '', window.location.pathname);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Hide loading screen
    if (pageLoader) {
      pageLoader.classList.add('hidden');
    }
  }, 300);
}

// Change page
function changePage(page) {
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
  const page = parseInt(pageNum);
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  
  if (page >= 1 && page <= totalPages) {
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
      suggestions.classList.remove('visible');
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
    suggestions.classList.remove('visible');
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
  
  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchWrapper.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.classList.remove('visible');
    }
  });
}

// Show search suggestions dropdown
function showSearchSuggestions(query) {
  const suggestions = document.getElementById('search-suggestions');
  const query_lower = query.toLowerCase();
  
  // Get unique suggestions from posts and history
  const matchedPosts = allPosts.filter(post =>
    post.title.toLowerCase().includes(query_lower) ||
    post.category.toLowerCase().includes(query_lower)
  ).slice(0, 5);
  
  const matchedHistory = searchHistory.filter(h =>
    h.toLowerCase().includes(query_lower) && h !== query
  ).slice(0, 3);
  
  let html = '';
  
  if (matchedPosts.length > 0) {
    matchedPosts.forEach(post => {
      html += `<div class="search-suggestion-item" onclick="selectSearchSuggestion('${post.title}')">${post.title}</div>`;
    });
  }
  
  if (matchedHistory.length > 0) {
    matchedHistory.forEach(item => {
      html += `<div class="search-suggestion-item" onclick="selectSearchSuggestion('${item}')" style="opacity: 0.7;">${item}</div>`;
    });
  }
  
  if (html) {
    suggestions.innerHTML = html;
    suggestions.classList.add('visible');
  } else {
    suggestions.classList.remove('visible');
  }
}

// Show search history dropdown
function showSearchHistory() {
  const suggestions = document.getElementById('search-suggestions');
  
  if (searchHistory.length === 0) {
    suggestions.classList.remove('visible');
    return;
  }
  
  let html = searchHistory.slice(0, 5).map(item =>
    `<div class="search-suggestion-item" onclick="selectSearchSuggestion('${item}')" style="opacity: 0.7;"><i class="fas fa-history"></i> ${item}</div>`
  ).join('');
  
  suggestions.innerHTML = html;
  suggestions.classList.add('visible');
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
  document.getElementById('search-suggestions').classList.remove('visible');
}

// Update search results display
function updateSearchResults() {
  const resultsInfo = document.getElementById('search-results-info');
  
  if (currentSearchQuery) {
    const count = filteredPosts.length;
    const text = count === 1 ? 'result' : 'results';
    resultsInfo.innerHTML = `Found <strong>${count}</strong> ${text} for "<strong>${currentSearchQuery}</strong>"`;
    resultsInfo.classList.add('visible');
  } else {
    resultsInfo.classList.remove('visible');
    resultsInfo.innerHTML = '';
  }
}

// Setup category filters
function setupFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  
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
  postContent.innerHTML = `
    <div class="post-header">
      <div class="post-header-content">
        <h1>${post.title}</h1>
        <div class="post-meta">
          <span>${formatDate(post.date)}</span>
          <span>•</span>
          <span>${formatCategory(post.category)}</span>
          <span>•</span>
          <span>${post.readTime} min read</span>
        </div>
        ${post.excerpt ? `<p class="post-excerpt">${post.excerpt}</p>` : ''}
      </div>
      <img src="${post.cover}" alt="${post.title}" class="post-cover" onerror="this.style.display='none'">
    </div>
    <div class="post-body">
      ${post.excerpt ? `<p class="post-excerpt post-body-excerpt">${post.excerpt}</p>` : ''}
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
  
  // Highlight code blocks
  if (typeof hljs !== 'undefined') {
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
  }
  
  // Load and setup comments
  setupCommentForm(slug);
  loadComments(slug);
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
    }
  } else {
    console.warn(`Element with id "${id}" not found`);
  }
}

// Setup comment form
function setupCommentForm(postSlug) {
  const commentForm = document.getElementById('comment-form');
  
  if (!commentForm) return;
  
  commentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('comment-name').value;
    const email = document.getElementById('comment-email').value;
    const text = document.getElementById('comment-text').value;
    
    // Get existing comments from localStorage
    const commentsKey = `comments_${postSlug}`;
    const existingComments = JSON.parse(localStorage.getItem(commentsKey)) || [];
    
    // Create new comment
    const newComment = {
      id: Date.now(),
      name,
      email,
      text,
      date: new Date().toISOString(),
      approved: true,
      replies: []
    };
    
    existingComments.push(newComment);
    localStorage.setItem(commentsKey, JSON.stringify(existingComments));
    
    // Clear form
    commentForm.reset();
    
    // Reload comments
    loadComments(postSlug);
    
    // Show success message
    alert('Comment posted successfully!');
  });
}

// Load and display comments
function loadComments(postSlug) {
  const commentsList = document.getElementById('comments-list');
  const commentsKey = `comments_${postSlug}`;
  const comments = JSON.parse(localStorage.getItem(commentsKey)) || [];
  
  if (!commentsList) return;
  
  // Filter only approved comments
  const approvedComments = comments.filter(c => c.approved);
  
  if (approvedComments.length === 0) {
    commentsList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No comments yet. Be the first to comment!</p>';
    return;
  }
  
  commentsList.innerHTML = approvedComments.map(comment => `
    <div class="comment" data-id="${comment.id}">
      <div class="comment-author">
        <div class="comment-avatar">${comment.name.charAt(0).toUpperCase()}</div>
        <div class="comment-header">
          <span class="comment-name">${escapeHtml(comment.name)}</span>
          <span class="comment-time">${formatDate(comment.date)}</span>
        </div>
        <div class="moderation-dashboard" style="margin-left: auto;">
          <button class="moderation-btn delete" onclick="deleteComment('${postSlug}', ${comment.id})">Delete</button>
        </div>
      </div>
      <div class="comment-text">${escapeHtml(comment.text)}</div>
      <div class="comment-actions">
        <button class="comment-btn" onclick="replyToComment(${comment.id})">Reply</button>
      </div>
      ${comment.replies && comment.replies.length > 0 ? `
        <div class="comment-replies">
          ${comment.replies.map(reply => `
            <div class="comment reply">
              <div class="comment-author">
                <div class="comment-avatar">${reply.name.charAt(0).toUpperCase()}</div>
                <div class="comment-header">
                  <span class="comment-name">${escapeHtml(reply.name)}</span>
                  <span class="comment-time">${formatDate(reply.date)}</span>
                </div>
              </div>
              <div class="comment-text">${escapeHtml(reply.text)}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Delete comment (moderation)
function deleteComment(postSlug, commentId) {
  if (!confirm('Are you sure you want to delete this comment?')) return;
  
  const commentsKey = `comments_${postSlug}`;
  const comments = JSON.parse(localStorage.getItem(commentsKey)) || [];
  
  const updatedComments = comments.filter(c => c.id !== commentId);
  localStorage.setItem(commentsKey, JSON.stringify(updatedComments));
  
  loadComments(postSlug);
}

// Reply to comment (placeholder for now)
function replyToComment(commentId) {
  alert('Reply feature coming soon!');
}

// Setup share buttons
function setupShareButtons(post) {
  const postUrl = `${window.location.origin}${window.location.pathname}?post=${post.slug}`;
  const postTitle = post.title;
  const twitterShare = document.getElementById('share-twitter');
  const discordShare = document.getElementById('share-discord');
  const copyShare = document.getElementById('share-copy');
  
  if (twitterShare) {
    const twitterText = `Check out "${postTitle}" on Nomu's blog`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(postUrl)}`;
    twitterShare.href = twitterUrl;
    twitterShare.target = '_blank';
    twitterShare.rel = 'noopener noreferrer';
    twitterShare.onclick = null; // Ensure click goes through
  }
  
  if (discordShare) {
    // For Discord, copy the link to clipboard
    discordShare.onclick = (e) => {
      e.preventDefault();
      const shareText = `Check out "${postTitle}": ${postUrl}`;
      navigator.clipboard.writeText(shareText).then(() => {
        const originalHTML = discordShare.innerHTML;
        discordShare.innerHTML = '<i class="fas fa-check"></i> Link copied!';
        discordShare.style.borderColor = 'var(--accent)';
        setTimeout(() => {
          discordShare.innerHTML = originalHTML;
          discordShare.style.borderColor = '';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy link to clipboard');
      });
    };
  }
  
  if (copyShare) {
    copyShare.onclick = (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(postUrl).then(() => {
        const originalHTML = copyShare.innerHTML;
        copyShare.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyShare.style.borderColor = 'var(--accent)';
        setTimeout(() => {
          copyShare.innerHTML = originalHTML;
          copyShare.style.borderColor = '';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy link to clipboard');
      });
    };
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

// Initialize page
async function initPage(postSlug) {
  console.log('initPage called with postSlug:', postSlug);
  
  // Show loader
  const pageLoader = document.getElementById('page-loader');
  if (pageLoader) {
    pageLoader.classList.remove('hidden');
  }
  
  await loadPosts();
  console.log('Posts loaded:', allPosts.length);
  
  setupBackToPosts();
  setupTOC(); // Initialize TOC functionality
  setupBackToTop(); // Initialize back to top button
  
  const heroSection = document.getElementById('hero');
  const blogSection = document.querySelector('.blog-section');
  const singleView = document.getElementById('single-post-view');
  
  if (postSlug) {
    // Show single post view
    if (heroSection) heroSection.style.display = 'none';
    blogSection.style.display = 'none';
    singleView.style.display = 'block';
    await renderSinglePost(postSlug);
  } else {
    // Show blog list view
    if (heroSection) heroSection.style.display = 'block';
    blogSection.style.display = 'block';
    singleView.style.display = 'none';
    console.log('Calling renderPostsList with', allPosts.length, 'posts');
    renderPostsList(allPosts, currentPage);
    setupSearch();
    setupFilters();
  }
  
  // Hide loader after content is loaded
  setTimeout(() => {
    if (pageLoader) {
      pageLoader.classList.add('hidden');
    }
  }, 500);
  
  // Handle browser back/forward navigation
  window.addEventListener('popstate', (event) => {
    const newPostSlug = getQueryParam('post');
    if (newPostSlug) {
      showSinglePost(newPostSlug);
    } else {
      hideSinglePost();
    }
  });
}