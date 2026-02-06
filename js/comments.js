// comments.js - Anonymous comments for GitHub Pages
// Uses Supabase REST if configured, otherwise localStorage fallback.

const COMMENTS_CONFIG = {
  backend: 'auto', // auto | supabase | local
  // Supabase setup: create a `comments` table with columns:
  // id (uuid or int), post_slug (text), name (text), text (text), created_at (timestamptz).
  supabaseUrl: 'https://xvrrmphwymqnsabgvaow.supabase.co',
  supabaseAnonKey: 'sb_publishable_DfJML-kfznX-9BnipbuHFg_YpmiUm26',
  supabaseTable: 'comments',
  maxLength: 2000
};

function getCommentsBackend() {
  if (COMMENTS_CONFIG.backend === 'supabase') return 'supabase';
  if (COMMENTS_CONFIG.backend === 'local') return 'local';
  return (COMMENTS_CONFIG.supabaseUrl && COMMENTS_CONFIG.supabaseAnonKey) ? 'supabase' : 'local';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function normalizeName(name) {
  const trimmed = (name || '').trim();
  return trimmed.length > 0 ? trimmed : 'Anonymous';
}

function normalizeText(text) {
  return (text || '').trim();
}

function getLocalKey(postSlug) {
  return `comments_${postSlug}`;
}

function loadLocalComments(postSlug) {
  const stored = localStorage.getItem(getLocalKey(postSlug));
  return stored ? JSON.parse(stored) : [];
}

function saveLocalComments(postSlug, comments) {
  localStorage.setItem(getLocalKey(postSlug), JSON.stringify(comments));
}

async function fetchSupabaseComments(postSlug) {
  const baseUrl = COMMENTS_CONFIG.supabaseUrl.replace(/\/$/, '');
  const table = COMMENTS_CONFIG.supabaseTable;
  const url = `${baseUrl}/rest/v1/${table}?post_slug=eq.${encodeURIComponent(postSlug)}&select=id,post_slug,name,text,created_at&order=created_at.asc`;

  const response = await fetch(url, {
    headers: {
      apikey: COMMENTS_CONFIG.supabaseAnonKey,
      Authorization: `Bearer ${COMMENTS_CONFIG.supabaseAnonKey}`
    }
  });

  if (!response.ok) {
    console.error('Failed to load comments:', await response.text());
    return [];
  }

  return response.json();
}

async function submitSupabaseComment(comment) {
  const baseUrl = COMMENTS_CONFIG.supabaseUrl.replace(/\/$/, '');
  const table = COMMENTS_CONFIG.supabaseTable;
  const url = `${baseUrl}/rest/v1/${table}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: COMMENTS_CONFIG.supabaseAnonKey,
      Authorization: `Bearer ${COMMENTS_CONFIG.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(comment)
  });

  if (!response.ok) {
    console.error('Failed to submit comment:', await response.text());
  }

  return response.ok;
}

async function loadCommentsForPost(postSlug) {
  if (!postSlug) return [];

  const backend = getCommentsBackend();
  if (backend === 'supabase') {
    return fetchSupabaseComments(postSlug);
  }

  return loadLocalComments(postSlug);
}

async function submitComment(postSlug, data) {
  if (!postSlug) return false;

  const name = normalizeName(data.name);
  const text = normalizeText(data.text);

  if (!text) {
    alert('Comment cannot be empty.');
    return false;
  }

  if (text.length > COMMENTS_CONFIG.maxLength) {
    alert(`Comment is too long (max ${COMMENTS_CONFIG.maxLength} characters).`);
    return false;
  }

  const comment = {
    post_slug: postSlug,
    name,
    text,
    created_at: new Date().toISOString()
  };

  const backend = getCommentsBackend();
  if (backend === 'supabase') {
    return submitSupabaseComment(comment);
  }

  const comments = loadLocalComments(postSlug);
  comments.push(comment);
  saveLocalComments(postSlug, comments);
  return true;
}

function formatCommentDate(dateString) {
  if (typeof formatDate === 'function') {
    return formatDate(dateString);
  }
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderComments(comments) {
  const container = document.getElementById('comments-list');
  if (!container) return;

  if (!comments || comments.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1.5rem 0;">No comments yet.</p>';
    return;
  }

  container.innerHTML = comments.map((comment) => {
    const name = escapeHtml(comment.name || 'Anonymous');
    const text = escapeHtml(comment.text || '');
    const when = formatCommentDate(comment.created_at || comment.timestamp || comment.date || new Date().toISOString());
    const avatar = name.charAt(0).toUpperCase();

    return `
      <div class="comment">
        <div class="comment-author">
          <div class="comment-avatar">${avatar}</div>
          <div class="comment-header">
            <span class="comment-name">${name}</span>
            <span class="comment-time">${when}</span>
          </div>
        </div>
        <div class="comment-text">${text}</div>
      </div>
    `;
  }).join('');
}

async function refreshComments(postSlug) {
  const container = document.getElementById('comments-list');
  if (!container) return;

  container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1.5rem 0;">Loading comments...</p>';
  const comments = await loadCommentsForPost(postSlug);
  renderComments(comments);
}

function initializeComments(postSlug) {
  const section = document.getElementById('comments-section');
  const form = document.getElementById('comment-form');

  if (!section || !form) return;

  section.style.display = 'block';
  form.dataset.postSlug = postSlug || '';

  if (!form.dataset.bound) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const currentSlug = form.dataset.postSlug;
      if (!currentSlug) return;

      const nameInput = document.getElementById('comment-name');
      const textInput = document.getElementById('comment-text');

      const name = nameInput ? nameInput.value : '';
      const text = textInput ? textInput.value : '';

      const success = await submitComment(currentSlug, { name, text });
      if (success) {
        form.reset();
        refreshComments(currentSlug);
      }
    });

    form.dataset.bound = 'true';
  }

  refreshComments(postSlug);
}
