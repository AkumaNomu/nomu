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
    'Video Editing': 'Video editing',
    'Life': 'Life',
    'Projects': 'Projects',
    'Politics': 'Politics',
  };
  return categoryMap[category] || category;
}

document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    // 1. Get the path from the link's href (e.g., "blog.html")
    const linkPath = link.getAttribute('href');

    // 2. Check if the current URL contains this link's path
    // We use 'includes' because your path might be "/my-site/blog.html"
    // Handle root "/" or "index.html" specifically if needed
    
    if (currentPath.includes(linkPath) || 
       (linkPath === '/' && (currentPath === '/' || currentPath.endsWith('index.html'))) ||
       (linkPath === 'index.html' && currentPath === '/')) {
       
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
});
