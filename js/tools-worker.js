// tools-worker.js
const encoder = new TextEncoder();

function toHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function toBase64Url(base64) {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hashDigest(payload) {
  const text = String(payload.text || '');
  const algorithm = payload.algorithm || 'SHA-256';
  const output = payload.output || 'hex';
  const buf = await crypto.subtle.digest(algorithm, encoder.encode(text));
  const bytes = new Uint8Array(buf);
  if (output === 'base64') return { digest: toBase64(bytes) };
  if (output === 'base64url') return { digest: toBase64Url(toBase64(bytes)) };
  return { digest: toHex(bytes) };
}

async function hmacDigest(payload) {
  const text = String(payload.text || '');
  const secret = String(payload.secret || '');
  const algorithm = payload.algorithm || 'SHA-256';
  const output = payload.output || 'hex';

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: { name: algorithm } },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(text));
  const bytes = new Uint8Array(sig);
  if (output === 'base64') return { digest: toBase64(bytes) };
  if (output === 'base64url') return { digest: toBase64Url(toBase64(bytes)) };
  return { digest: toHex(bytes) };
}

function formatJson(payload) {
  const input = payload.input;
  const indent = Number.isFinite(Number(payload.indent)) ? Number(payload.indent) : 2;
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  return { formatted: JSON.stringify(parsed, null, Math.min(8, Math.max(0, indent))) };
}

function quickDiff(left, right) {
  const a = String(left || '').split(/\r?\n/);
  const b = String(right || '').split(/\r?\n/);
  const n = Math.max(a.length, b.length);
  const lines = [];
  let added = 0;
  let removed = 0;
  let context = 0;

  for (let i = 0; i < n; i += 1) {
    const l = a[i];
    const r = b[i];
    if (l === r) {
      if (typeof l === 'string') {
        lines.push({ type: 'context', text: l });
        context += 1;
      }
    } else {
      if (typeof l === 'string') {
        lines.push({ type: 'remove', text: l });
        removed += 1;
      }
      if (typeof r === 'string') {
        lines.push({ type: 'add', text: r });
        added += 1;
      }
    }
  }

  return { lines, stats: { added, removed, context } };
}

function lcsDiff(left, right) {
  const a = String(left || '').split(/\r?\n/);
  const b = String(right || '').split(/\r?\n/);
  const m = a.length;
  const n = b.length;

  if (m * n > 220000) {
    return quickDiff(left, right);
  }

  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const lines = [];
  let i = m;
  let j = n;
  let added = 0;
  let removed = 0;
  let context = 0;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lines.push({ type: 'context', text: a[i - 1] });
      context += 1;
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      lines.push({ type: 'remove', text: a[i - 1] });
      removed += 1;
      i -= 1;
    } else {
      lines.push({ type: 'add', text: b[j - 1] });
      added += 1;
      j -= 1;
    }
  }

  while (i > 0) {
    lines.push({ type: 'remove', text: a[i - 1] });
    removed += 1;
    i -= 1;
  }

  while (j > 0) {
    lines.push({ type: 'add', text: b[j - 1] });
    added += 1;
    j -= 1;
  }

  lines.reverse();
  return { lines, stats: { added, removed, context } };
}

async function handle(type, payload) {
  if (type === 'hash') return hashDigest(payload || {});
  if (type === 'hmac') return hmacDigest(payload || {});
  if (type === 'json-format') return formatJson(payload || {});
  if (type === 'text-diff') return lcsDiff((payload || {}).left, (payload || {}).right);
  if (type === 'hash-compare') {
    const left = await hashDigest({ text: (payload || {}).left || '', algorithm: (payload || {}).algorithm || 'SHA-256', output: 'hex' });
    const right = await hashDigest({ text: (payload || {}).right || '', algorithm: (payload || {}).algorithm || 'SHA-256', output: 'hex' });
    return { leftHash: left.digest, rightHash: right.digest, match: left.digest === right.digest };
  }
  throw new Error(`Unsupported task: ${type}`);
}

self.onmessage = async (event) => {
  const { id, type, payload } = event.data || {};
  try {
    const result = await handle(type, payload);
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error && error.message ? error.message : 'Worker error' });
  }
};
