// blog-loader.js - Blog Loader & Logic
// NO MODULE EXPORTS - Using global scope for compatibility
// Requires: utils.js, markdown-parser.js to be loaded first

// Manifest of all blog posts
const POST_MANIFEST = [
  'nomu/posts/Markdowntest.md',
  'nomu/posts/Nomu\'s_Site.md',

];

let allPosts = [];
let filteredPosts = [];
let currentCategory = 'all';
let currentSearchQuery = '';

// Load all posts from markdown files
async function loadPosts() {
  if (allPosts.length > 0) {
    return allPosts;
  }
  
  const posts = [];
  
  for (const filename of POST_MANIFEST) {
    try {
      console.log(`Attempting to load: posts/${filename}`);
      const response = await fetch(`posts/${filename}`);
      
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

// Render post cards in list view
function renderPostsList(posts) {
  const container = document.getElementById('posts-list');
  
  if (!container) {
    console.error('posts-list container not found');
    return;
  }
  
  if (posts.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No posts found.</p>';
    return;
  }
  
  container.innerHTML = posts.map(post => `
    <article class="post-card">
      <div class="post-card-content">
        <h3><a href="blog.html?post=${post.slug}">${post.title}</a></h3>
        <div class="post-meta">
          <span>${formatDate(post.date)}</span>
          <span>•</span>
          <span>${formatCategory(post.category)}</span>
          <span>•</span>
          <span>${post.readTime} min read</span>
        </div>
        <p class="post-excerpt">${post.excerpt}</p>
        <a href="blog.html?post=${post.slug}" class="read-more">Read more</a>
      </div>
      <img src="${post.cover}" alt="${post.title}" class="post-thumb" onerror="this.style.display='none'">
    </article>
  `).join('');
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
  renderPostsList(posts);
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
      ${htmlContent}
    </div>
  `;
  
  // Setup prev/next navigation
  setupPostNavigation(slug);
}

// Setup prev/next post navigation
function setupPostNavigation(currentSlug) {
  const currentIndex = allPosts.findIndex(p => p.slug === currentSlug);
  
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  
  const prevLink = document.getElementById('prev-post');
  const nextLink = document.getElementById('next-post');
  
  if (prevPost) {
    prevLink.href = `blog.html?post=${prevPost.slug}`;
    prevLink.querySelector('.nav-title').textContent = prevPost.title;
    prevLink.style.display = 'flex';
  } else {
    prevLink.style.display = 'none';
  }
  
  if (nextPost) {
    nextLink.href = `blog.html?post=${nextPost.slug}`;
    nextLink.querySelector('.nav-title').textContent = nextPost.title;
    nextLink.style.display = 'flex';
  } else {
    nextLink.style.display = 'none';
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

// Initialize blog page
async function initBlogPage(postSlug) {
  await loadPosts();
  
  const listView = document.getElementById('blog-list-view');
  const singleView = document.getElementById('single-post-view');
  
  if (postSlug) {
    // Show single post view
    listView.style.display = 'none';
    singleView.style.display = 'block';
    await renderSinglePost(postSlug);
    setupCommentForm();
  } else {
    // Show list view
    listView.style.display = 'block';
    singleView.style.display = 'none';
    renderPostsList(allPosts);
    setupSearch();
    setupFilters();
  }
}