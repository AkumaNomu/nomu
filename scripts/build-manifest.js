const fs = require('fs');
const path = require('path');

function slugifyName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function splitList(value) {
  if (!value) return [];
  return String(value)
    .split('|')
    .join(',')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function parseGallery(value) {
  if (!value) return [];
  return String(value).split('|').map(s => s.trim()).filter(Boolean).map(entry => {
    const parts = entry.split('::');
    return { src: (parts[0] || '').trim(), caption: (parts[1] || '').trim() };
  }).filter(g => g.src);
}

function parseQuickLinks(value) {
  if (!value) return [];
  return String(value).split('|').map(s => s.trim()).filter(Boolean).map(entry => {
    const parts = entry.split('::');
    return { label: (parts[0] || '').trim(), url: (parts[1] || '').trim() };
  }).filter(l => l.label && l.url);
}

function parseFrontmatter(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  if (!lines.length || lines[0].trim() !== '---') return { meta: {}, body: markdown };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { end = i; break; }
  }
  if (end === -1) return { meta: {}, body: markdown };

  const meta = {};
  for (const line of lines.slice(1, end)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) meta[key] = value;
  }
  return { meta, body: lines.slice(end + 1).join('\n') };
}

function estimateReadTime(markdown) {
  const words = String(markdown || '').trim().split(/\s+/).filter(Boolean).length;
  const wpm = 200;
  return Math.max(1, Math.round(words / wpm));
}

async function build() {
  const contentDir = path.join(__dirname, '..', 'content');
  const manifestPath = path.join(contentDir, 'content.json');

  if (!fs.existsSync(manifestPath)) {
    console.error('content.json not found');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const metadata = {
    posts: [],
    projects: [],
    resources: []
  };

  // Posts
  if (manifest.POST_MANIFEST) {
    for (const name of manifest.POST_MANIFEST) {
      const slug = slugifyName(name);
      const postDir = path.join(contentDir, 'posts', name);
      const candidates = [
        path.join(postDir, `${name}.md`),
        path.join(postDir, `${slug}.md`)
      ];

      let mdPath = candidates.find(p => fs.existsSync(p));
      if (mdPath) {
        const md = fs.readFileSync(mdPath, 'utf8');
        const { meta, body } = parseFrontmatter(md);
        const tags = splitList(meta.tags);
        const readTime = parseInt(meta.readTime, 10) || estimateReadTime(body);
        metadata.posts.push({
          id: meta.id || slug,
          title: meta.title || name,
          description: meta.description || meta.desc || '',
          date: meta.date || new Date().toISOString().slice(0, 10),
          tags,
          readTime,
          cover: meta.cover || null,
          contentPath: path.relative(contentDir, mdPath)
        });
      }
    }
  }

  // Projects
  if (manifest.PROJECT_MANIFEST) {
    for (const name of manifest.PROJECT_MANIFEST) {
      const slug = slugifyName(name);
      const projDir = path.join(contentDir, 'projects', name);
      const candidates = [
        path.join(projDir, `${slug}.md`),
        path.join(projDir, `${name}.md`)
      ];

      let mdPath = candidates.find(p => fs.existsSync(p));
      if (mdPath) {
        const md = fs.readFileSync(mdPath, 'utf8');
        const { meta, body } = parseFrontmatter(md);
        metadata.projects.push({
          id: meta.id || slug,
          name: meta.name || name,
          description: meta.description || '',
          category: meta.category || 'Development',
          focus: meta.focus || '',
          type: meta.type || 'Project',
          icon: meta.icon || 'terminal',
          stack: splitList(meta.stack),
          url: meta.url || '',
          repo: meta.repo || '',
          live: meta.live || '',
          video: meta.video || '',
          gallery: parseGallery(meta.gallery),
          featured: String(meta.featured).toLowerCase() === 'true',
          cover: meta.cover || null,
          badge: meta.badge || '',
          contentPath: path.relative(contentDir, mdPath)
        });
      }
    }
  }

  // Resources
  if (manifest.RESOURCE_MANIFEST) {
    const resourceTypes = ['Guides', 'Sites', 'Tutorials', 'Books', 'Apps', 'Courses', 'Guide', 'Site', 'Tutorial', 'Book', 'App', 'Course'];
    for (const name of manifest.RESOURCE_MANIFEST) {
      const slug = slugifyName(name);
      let mdPath = null;

      for (const type of resourceTypes) {
        const p1 = path.join(contentDir, 'resources', type, name, `${slug}.md`);
        const p2 = path.join(contentDir, 'resources', type, name, `${name}.md`);
        if (fs.existsSync(p1)) { mdPath = p1; break; }
        if (fs.existsSync(p2)) { mdPath = p2; break; }
      }

      if (mdPath) {
        const md = fs.readFileSync(mdPath, 'utf8');
        const { meta, body } = parseFrontmatter(md);
        metadata.resources.push({
          id: meta.id || slug,
          title: meta.title || name,
          desc: meta.desc || meta.description || '',
          type: meta.type || 'Guide',
          difficulty: meta.difficulty || '',
          url: meta.url || '',
          cover: meta.cover || null,
          video: meta.video || '',
          gallery: parseGallery(meta.gallery),
          steps: splitList(meta.steps),
          quickLinks: parseQuickLinks(meta.quickLinks),
          contentPath: path.relative(contentDir, mdPath)
        });
      }
    }
  }

  fs.writeFileSync(path.join(contentDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  console.log('Successfully generated content/metadata.json');
}

build();
