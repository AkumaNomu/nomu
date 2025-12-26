// markdown-parser.js - Markdown Parser
// NO MODULE EXPORTS - Using global scope for compatibility

// Initialize markdown-it with plugins
let md;

function initMarkdown() {
  if (typeof markdownit === 'undefined') {
    console.error('markdown-it library not loaded');
    return null;
  }
  
  // Initialize markdown-it with options
  md = markdownit({
    html: true,        // Enable HTML tags in source
    linkify: true,     // Auto-convert URL-like text to links
    typographer: true, // Enable some language-neutral replacement + quotes beautification
    breaks: false      // Convert '\n' in paragraphs into <br>
  });
  
  // Add footnote plugin if available
  if (typeof markdownitFootnote !== 'undefined') {
    md.use(markdownitFootnote);
  }
  
  return md;
}

// Parse markdown to HTML
function parseMarkdown(markdown) {
  if (!md) {
    md = initMarkdown();
  }
  
  if (!md) {
    return '<p>Error: Markdown parser not available</p>';
  }
  
  try {
    return md.render(markdown);
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return '<p>Error parsing markdown content</p>';
  }
}

// Initialize on script load
if (typeof markdownit !== 'undefined') {
  initMarkdown();
}