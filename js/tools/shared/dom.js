export function qs(root, sel) {
  return (root || document).querySelector(sel);
}

export function qsa(root, sel) {
  return Array.from((root || document).querySelectorAll(sel));
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function emitToast(message, type = 'info') {
  if (typeof window.toast === 'function') window.toast(message, type);
}

export function clampNumber(value, min, max) {
  let num = Number(value);
  if (Number.isNaN(num)) num = 0;
  if (min !== undefined && min !== null) num = Math.max(min, num);
  if (max !== undefined && max !== null) num = Math.min(max, num);
  return num;
}
