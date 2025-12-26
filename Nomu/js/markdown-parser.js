// js/markdown-parser.js

// 1) Init markdown-it with the right options
const md = window.markdownit({
  html: true,          // allow inline HTML (for <dl>, YouTube embed, etc.)
  linkify: true,       // auto-link URLs
  typographer: true,   // nicer quotes, etc.
  breaks: false        // keep normal paragraph behaviour
}).use(window.markdownitFootnote);

// 2) Frontmatter splitter (unchanged)
function splitFrontmatter(raw) {
  if (!raw.startsWith('---')) {
    return { frontmatter: {}, content: raw };
  }
  const end = raw.indexOf('---', 3);
  if (end === -1) {
    return { frontmatter: {}, content: raw };
  }
  const fmText = raw.slice(3, end).trim();
  const content = raw.slice(end + 3).trim();
  let frontmatter = {};
  try {
    frontmatter = jsyaml.load(fmText) || {};
  } catch (e) {
    console.error('Frontmatter parse error', e);
  }
  return { frontmatter, content };
}

// 3) Markdown → HTML
function markdownToHtml(markdown) {
  return md.render(markdown);
}
