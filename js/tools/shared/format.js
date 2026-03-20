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

export function fmtBytes(bytes) {
  const num = Number(bytes || 0);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatNumber(value, digits = 6) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return Number(num.toFixed(digits)).toString();
}

export function safeString(value) {
  return value === undefined || value === null ? '' : String(value);
}
