// js/utils.js

// Simple slug generator from filename or title
function slugFromFilename(path) {
  const file = path.split('/').pop();
  return file.replace(/\.md$/i, '');
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}
// js/utils.js

