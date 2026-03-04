export function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let val = size;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val.toFixed(val < 10 && idx > 0 ? 2 : 0)} ${units[idx]}`;
}

export function formatNumber(value, digits = 6) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return Number(num.toFixed(digits)).toString();
}

export function safeString(value) {
  return value === undefined || value === null ? '' : String(value);
}
