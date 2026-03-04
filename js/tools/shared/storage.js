const STORAGE_PREFIX = 'tools:';

export function loadToolState(toolId, defaults = {}) {
  const key = `${STORAGE_PREFIX}${toolId}:state`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    return { ...defaults, ...(parsed || {}) };
  } catch (_) {
    return { ...defaults };
  }
}

export function saveToolState(toolId, state) {
  const key = `${STORAGE_PREFIX}${toolId}:state`;
  try {
    localStorage.setItem(key, JSON.stringify(state || {}));
  } catch (_) {
    return;
  }
}

export function clearToolState(toolId) {
  const key = `${STORAGE_PREFIX}${toolId}:state`;
  try {
    localStorage.removeItem(key);
  } catch (_) {
    return;
  }
}
