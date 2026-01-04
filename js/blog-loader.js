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
];


let allPosts = [];
let filteredPosts = [];
let currentCategory = 'all';
let currentSearchQuery = '';
let currentPage = 1;
const postsPerPage = 5;

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
        excerpt: frontmatter.excerpt || '',
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
  
  container.innerHTML = postsToShow.map(post => `
    <article class="post-card">
      <div class="post-card-content">
        <h3><a href="#" onclick="showSinglePost('${post.slug}'); return false;">${post.title}</a></h3>
        <div class="post-meta">
          <span>${formatDate(post.date)}</span>
          <span>•</span>
          <span>${formatCategory(post.category)}</span>
          <span>•</span>
          <span>${post.readTime} min read</span>
        </div>
        <p class="post-excerpt">${post.excerpt}</p>
        <a href="#" onclick="showSinglePost('${post.slug}'); return false;" class="read-more">Read more</a>
      </div>
      <img src="${post.cover}" alt="${post.title}" class="post-thumb" onerror="this.style.display='none'">
    </article>
  `).join('');
  
  // Render pagination
  renderPagination(totalPages, page);
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
  const heroSection = document.getElementById('hero');
  const blogSection = document.querySelector('.blog-section');
  const singleView = document.getElementById('single-post-view');
  
  heroSection.style.display = 'none';
  blogSection.style.display = 'none';
  singleView.style.display = 'block';
  
  renderSinglePost(slug);
  setupCommentForm();
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Update URL without reloading
  history.pushState({ post: slug }, '', `?post=${slug}`);
}

// Hide single post view and show blog list
function hideSinglePost() {
  const heroSection = document.getElementById('hero');
  const blogSection = document.querySelector('.blog-section');
  const singleView = document.getElementById('single-post-view');
  
  heroSection.style.display = 'block';
  blogSection.style.display = 'block';
  singleView.style.display = 'none';
  
  // Hide TOC sidebar
  const tocSidebar = document.getElementById('toc-sidebar');
  if (tocSidebar) {
    tocSidebar.classList.remove('open');
  }
  
  // Update URL
  history.pushState({}, '', window.location.pathname);
}

// Change page
function changePage(page) {
  currentPage = page;
  renderPostsList(filteredPosts, currentPage);
  
  // Scroll to top of posts list
  document.getElementById('posts-list').scrollIntoView({ behavior: 'smooth' });
  
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

// Filter posts based on category and search query
function filterPosts() {
  let posts = allPosts;
  
  // Filter by category
  if (currentCategory !== 'all') {
    posts = posts.filter(post => post.category === currentCategory);
  }
  
  // Filter by search query
  if (currentSearchQuery) {
    const query = currentSearchQuery.toLowerCase();
    posts = posts.filter(post => 
      post.title.toLowerCase().includes(query) ||
      post.excerpt.toLowerCase().includes(query) ||
      post.category.toLowerCase().includes(query)
    );
  }
  
  filteredPosts = posts;
  currentPage = 1; // Reset to first page when filtering
  renderPostsList(posts, currentPage);
}

// Setup search functionality
function setupSearch() {
  const searchInput = document.getElementById('search-input');
  
  if (!searchInput) {
    console.error('search-input not found');
    return;
  }
  
  searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    filterPosts();
  });
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
  
  // Generate TOC from processed HTML (with IDs)
  const tocHtml = generateTOCFromProcessed(processedHtml);
  
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
      ${processedHtml}
    </div>
  `;
  
  // Render TOC
  const tocNav = document.getElementById('toc-nav');
  if (tocNav) {
    tocNav.innerHTML = tocHtml;
  }
  
  // Setup prev/next navigation
  setupPostNavigation(slug);
  
  // Setup TOC toggle functionality
  setupTOC();
}

// Setup TOC toggle functionality
function setupTOC() {
  const tocToggle = document.getElementById('toc-toggle');
  const tocSidebar = document.getElementById('toc-sidebar');
  const tocClose = document.getElementById('toc-close');
  const controlButtons = document.getElementById('control-buttons');
  
  if (tocToggle) {
    if (tocSidebar) {
      // We're on a single post page with TOC
      tocToggle.style.display = 'block';
      if (controlButtons) {
        controlButtons.style.gridTemplateColumns = '60px 60px';
      }
      
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
      // We're not on a single post page, hide TOC button and adjust grid
      tocToggle.style.display = 'none';
      if (controlButtons) {
        controlButtons.style.gridTemplateColumns = '60px';
      }
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
      <a href="#${id}" class="toc-link" onclick="smoothScrollTo('${id}'); return false;">${text}</a>
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
function setupCommentForm() {
  const form = document.getElementById('comment-form');
  
  if (!form) {
    console.error('comment-form not found');
    return;
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('comment-name').value;
    const comment = document.getElementById('comment-text').value;
    
    // In production, this would POST to Staticman or similar service
    console.log('Comment submitted:', { name, comment });
    
    // Show success message
    alert('Comment submitted! (In production, this would be sent to a backend service)');
    
    // Clear form
    form.reset();
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
  await loadPosts();
  console.log('Posts loaded:', allPosts.length);
  
  setupBackToPosts();
  setupTOC(); // Initialize TOC functionality
  
  const heroSection = document.getElementById('hero');
  const blogSection = document.querySelector('.blog-section');
  const singleView = document.getElementById('single-post-view');
  
  if (postSlug) {
    // Show single post view
    heroSection.style.display = 'none';
    blogSection.style.display = 'none';
    singleView.style.display = 'block';
    await renderSinglePost(postSlug);
    setupCommentForm();
  } else {
    // Show blog list view
    heroSection.style.display = 'block';
    blogSection.style.display = 'block';
    singleView.style.display = 'none';
    console.log('Calling renderPostsList with', allPosts.length, 'posts');
    renderPostsList(allPosts, currentPage);
    setupSearch();
    setupFilters();
  }
  
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