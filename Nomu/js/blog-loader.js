// js/blog-loader.js

// --------------- CONFIG ----------------

// List your markdown files here.
// You can add more as you create them.
const POST_FILES = [
  'posts/Nomu\'s_Site.md',
  'posts/Markdowntest.md'
];

// --------------- INTERNAL STATE ----------------

let allPosts = []; // { slug, path, meta, rawContent }

// --------------- LOAD & PARSE POSTS ----------------

async function loadAllPosts() {
  if (allPosts.length) return allPosts;

  const promises = POST_FILES.map(async (path) => {
    const res = await fetch(path);
    const raw = await res.text();
    const { frontmatter, content } = splitFrontmatter(raw);
    const slug = slugFromFilename(path);

    const meta = {
      title: frontmatter.title || slug,
      date: frontmatter.date || '',
      category: frontmatter.category || 'uncategorized',
      author: frontmatter.author || 'You',
      excerpt: frontmatter.excerpt || '',
      cover: frontmatter.cover || '' // optional cover image path
    };

    return { slug, path, meta, rawContent: content };
  });

  const posts = await Promise.all(promises);
  // Sort newest first
  posts.sort((a, b) => new Date(b.meta.date) - new Date(a.meta.date));
  allPosts = posts;
  return posts;
}

// --------------- READING TIME ----------------

function estimateReadingTime(text) {
  const wordsPerMinute = 220;
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  return minutes;
}

// --------------- HOMEPAGE: SIMPLE LATEST LIST ----------------

async function loadLatestPosts(containerSelector, count = 3) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const posts = await loadAllPosts();
  const latest = posts.slice(0, count);

  container.innerHTML = latest.map((post) => {
    const readingMinutes = estimateReadingTime(post.rawContent);
    return `
      <article class="post-card">
        <h3><a href="blog.html?post=${post.slug}">${post.meta.title}</a></h3>
        <p class="post-meta">
          ${formatDate(post.meta.date)} · ${post.meta.category} · ~${readingMinutes} min read
        </p>
        <p>${post.meta.excerpt}</p>
      </article>
    `;
  }).join('');
}

// --------------- HOMEPAGE: LATEST POSTS CAROUSEL ----------------

async function initLatestCarousel() {
  const track = document.getElementById('latest-carousel-track');
  const btnPrev = document.getElementById('latest-prev');
  const btnNext = document.getElementById('latest-next');
  if (!track || !btnPrev || !btnNext) return;

  const posts = await loadAllPosts();
  const latest = posts.slice(0, 9); // up to 9 posts in carousel

  track.innerHTML = latest.map((post) => {
    const slug = post.slug;
    // Cover: from frontmatter, or fallback based on slug
    const cover =
      post.meta.cover ||
      `assets/images/${slug}.jpg`;

    const readingMinutes = estimateReadingTime(post.rawContent);

    return `
      <article class="latest-card">
        <div class="latest-card-cover">
          <img src="${cover}" alt="${post.meta.title}">
        </div>
        <div class="latest-card-body">
          <div class="latest-card-meta">
            <span>${post.meta.category}</span>
            <span>${formatDate(post.meta.date)}</span>
          </div>
          <h3 class="latest-card-title">
            <a href="blog.html?post=${slug}">
              ${post.meta.title}
            </a>
          </h3>
          <p class="latest-card-excerpt">
            ${post.meta.excerpt || ''}
          </p>
          <div class="latest-card-footer">
            <span>~${readingMinutes} min read</span>
            <a href="blog.html?post=${slug}">Read →</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  const cards = track.querySelectorAll('.latest-card');
  if (!cards.length) return;

  function scrollByOne(direction) {
    const card = cards[0];
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || '16') || 16;
    const cardWidth = card.offsetWidth + gap;
    const delta = direction === 'next' ? cardWidth : -cardWidth;
    track.scrollBy({ left: delta, behavior: 'smooth' });
  }

  btnPrev.addEventListener('click', () => scrollByOne('prev'));
  btnNext.addEventListener('click', () => scrollByOne('next'));
}

// --------------- BLOG LIST + SEARCH + FILTERS ----------------

let filteredCategory = 'all';
let searchQuery = '';

function renderPostCards(posts, container) {
  container.innerHTML = posts.map((post) => {
    const readingMinutes = estimateReadingTime(post.rawContent);
    const searchText = (
      post.meta.title +
      ' ' +
      post.meta.excerpt +
      ' ' +
      post.meta.category
    ).toLowerCase();

    const cover =
      post.meta.cover ||
      `assets/images/${post.slug}.jpg`;

    return `
  <article class="post-card" data-category="${post.meta.category}"
           data-search="${searchText}">
    <div class="post-card-main">
      <div class="post-card-text">
        <h2><a href="blog.html?post=${post.slug}">${post.meta.title}</a></h2>
        <p class="post-meta">
          ${formatDate(post.meta.date)} · ${post.meta.category} · ~${readingMinutes} min read
        </p>
        <p>${post.meta.excerpt}</p>
        <a href="blog.html?post=${post.slug}" class="read-more">Read more</a>
      </div>
      <div class="post-card-thumb">
        <img src="${cover}" alt="${post.meta.title}">
      </div>
    </div>
  </article>
`;
    }).join('');
}


async function renderBlogList() {
  const listEl = document.getElementById('blog-list');
  if (!listEl) return;

  const posts = await loadAllPosts();
  renderPostCards(posts, listEl);
  setupCategoryFilters();
  setupSearch();
  applyFilters();
}

function setupSearch() {
  const input = document.getElementById('blog-search');
  if (!input) return;

  input.addEventListener('input', () => {
    searchQuery = input.value.toLowerCase();
    applyFilters();
  });
}

function applyFilters() {
  const cards = document.querySelectorAll('#blog-list .post-card');

  cards.forEach((card) => {
    const cat = card.dataset.category;
    const matchesCategory = filteredCategory === 'all' || cat === filteredCategory;

    const text = (card.dataset.search || '').toLowerCase();
    const matchesSearch = !searchQuery || text.includes(searchQuery);

    card.style.display = matchesCategory && matchesSearch ? '' : 'none';
  });
}

function setupCategoryFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      filteredCategory = cat;
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });

  const initialCat = getQueryParam('category');
  if (initialCat) {
    const targetBtn = document.querySelector(
      `.filter-btn[data-category="${initialCat}"]`
    );
    if (targetBtn) targetBtn.click();
  }
}

// --------------- SINGLE POST VIEW ----------------

async function renderSinglePost(slug) {
  const posts = await loadAllPosts();
  const index = posts.findIndex((p) => p.slug === slug);
  const articleEl = document.getElementById('post-article');
  if (!articleEl) return;

  if (index === -1) {
    articleEl.innerHTML = '<p>Post not found.</p>';
    return;
  }

  const post = posts[index];
  const readingMinutes = estimateReadingTime(post.rawContent);
  const htmlContent = markdownToHtml(post.rawContent);

  articleEl.innerHTML = `
    <h1>${post.meta.title}</h1>
    <p class="post-meta">
      ${formatDate(post.meta.date)} · ${post.meta.category} · ${post.meta.author}
      · ~${readingMinutes} min read
    </p>
    <hr>
    <div class="post-body">
      ${htmlContent}
    </div>
  `;
}


// --------------- ENTRY POINT FOR blog.html ----------------

async function initBlogPage() {
  const postSlug = getQueryParam('post');
  const listView = document.getElementById('blog-list-view');
  const postView = document.getElementById('blog-post-view');

  if (postSlug) {
    if (listView) listView.classList.add('hidden');
    if (postView) postView.classList.remove('hidden');
    await renderSinglePost(postSlug);
  } else {
    if (postView) postView.classList.add('hidden');
    if (listView) listView.classList.remove('hidden');
    await renderBlogList();
  }
}

