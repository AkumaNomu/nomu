export function initAnimations() {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    document.body.classList.add('anim-disabled');
    return;
  }

  const selectors = [
    '.hero',
    '.hero-actions .btn',
    '.sec-header',
    '.post-card',
    '.post-list .post-card',
    '.proj-card',
    '.project-card',
    '.proj-grid > *',
    '.res-card',
    '.resource-card',
    '.res-grid > *',
    '.tool-card-row',
    '.tool-shell',
    '.pwtool-card',
    '.tools-hub-head',
    '.tools-panel-shell',
    '.tools-cats .tool-cat-btn',
    '#left-rail .nav-btn',
    '#right-rail .rr-section',
    '.stats-grid > *',
    '.search-box',
    '.actions-box',
    '.viewer-shell',
    '.toast',
  ];

  const seen = new WeakSet();
  let observer = null;

  const observeTargets = () => {
    const targets = new Set();
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => targets.add(el));
    });

    const listTargets = Array.from(targets);
    listTargets.forEach((el, idx) => {
      if (seen.has(el)) return;
      el.classList.add('anim-reveal');
      // Keep reveal cascades deliberate so the page reads as one smooth motion system.
      el.style.setProperty('--anim-delay', `${idx * 96}ms`);
      if (observer) observer.observe(el);
      seen.add(el);
    });
  };

  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('anim-in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

  observeTargets();

  window.refreshAnimations = () => {
    observeTargets();
  };
}

initAnimations();
