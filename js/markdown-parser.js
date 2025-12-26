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

function styleQuotes(htmlContent) {
  // Regex explains:
  // 1. (?<!=)  : Negative lookbehind to avoid matching HTML attributes like class="foo"
  // 2. "([^"]+)" : Matches content inside straight double quotes
  // 3. |       : OR
  // 4. “([^”]+)” : Matches content inside curly quotes
  
  // Note: We parse this AFTER markdown conversion to avoid breaking HTML tags
  
  // But doing regex on raw HTML is risky. 
  // A safer way is to traverse text nodes of the rendered content.
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  const walker = document.createTreeWalker(
    tempDiv,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  while (node = walker.nextNode()) {
    // Skip if parent is a script, style, or code tag
    if (['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(node.parentNode.tagName)) {
      continue;
    }

    const text = node.nodeValue;
    // Match quotes but allow basic punctuation inside
    const regex = /"([^"]+)"|“([^”]+)”/g;
    
    if (regex.test(text)) {
      const span = document.createElement('span');
      // Replace quotes with styled span, keeping the quotes visible
      // or removing them if you prefer. Here we keep them.
      span.innerHTML = text.replace(regex, (match) => {
        return `<span class="quoted-text">${match}</span>`;
      });
      
      node.parentNode.replaceChild(span, node);
    }
  }
  
  return tempDiv.innerHTML;
}


// Initialize on script load
if (typeof markdownit !== 'undefined') {
  initMarkdown();
}

