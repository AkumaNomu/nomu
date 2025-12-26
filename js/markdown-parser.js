// markdown-parser.js - Markdown Parser
// NO MODULE EXPORTS - Using global scope for compatibility

let md;

function initMarkdown() {
  if (typeof markdownit === 'undefined') {
    console.error('markdown-it library not loaded');
    return null;
  }
  
  md = window.markdownit({
    html: true,
    linkify: true,
    typographer: true,
    breaks: false,
    highlight: function (str, lang) {
      if (lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
        try {
          return '<pre><code class="hljs">' +
                 hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                 '</code></pre>';
        } catch (__) {}
      }
      return '<pre><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>';
    }
  });
  
  // REPLACE THE OLD KATEX BLOCK WITH THIS:
  if (typeof texmath !== 'undefined' && typeof katex !== 'undefined') {
    md.use(texmath, { 
      engine: katex, 
      delimiters: 'dollars', // Supports $...$ and $$...$$
      katexOptions: { macros: { "\\R": "\\mathbb{R}" } } // Optional macros
    });
  } else {
    console.warn('Math plugins (texmath/katex) not loaded');
  }

  // Footnotes
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
