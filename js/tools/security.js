/* -- Password Generator -- */
function passwordTool() {
  return `
    <div class="pass-display" id="pw-display">
      <span class="pass-text" id="pw-text">Click Generate</span>
      <button class="copy-icon-btn" onclick="copyText('pw-text')">
        <svg class="icon-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
    </div>
    <div class="tool-row">
      <span class="tool-label">Length: <span id="pw-len-val">16</span></span>
      <input class="tool-range w-40" type="range" id="pw-len" min="8" max="64" value="16" oninput="document.getElementById('pw-len-val').textContent=this.value"/>
    </div>
    <div class="checkboxes">
      <label class="tool-check"><input type="checkbox" id="pw-upper" checked>Uppercase (A-Z)</label>
      <label class="tool-check"><input type="checkbox" id="pw-lower" checked>Lowercase (a-z)</label>
      <label class="tool-check"><input type="checkbox" id="pw-num" checked>Numbers (0-9)</label>
      <label class="tool-check"><input type="checkbox" id="pw-sym" checked>Symbols (!@#$%)</label>
    </div>
    <button class="btn btn-primary w-full" onclick="genPassword()">
      <svg class="icon-3_5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
      Generate Password
    </button>`;
}
function initTool(id) { if (id === 'password') genPassword(); if (id === 'uuid') genUUIDs(); if (id === 'color') updateColor(); }
function genPassword() {
  const len = parseInt(document.getElementById('pw-len')?.value || 16);
  let chars = '';
  if (document.getElementById('pw-upper')?.checked) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (document.getElementById('pw-lower')?.checked) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (document.getElementById('pw-num')?.checked) chars += '0123456789';
  if (document.getElementById('pw-sym')?.checked) chars += '!@#$%^&*()-_=+[]{}|;:,.<>?';
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  const pw = Array.from(arr).map(x => chars[x % chars.length]).join('');
  const el = document.getElementById('pw-text');
  if (el) { el.textContent = pw; el.style.animation = 'none'; el.offsetHeight; el.style.animation = 'fadeUp .2s ease both'; }
}

/* -- Hash Tool -- */
function hashTool() {
  return `
    <div class="hash-tabs" id="hash-tabs">
      ${['SHA-256', 'SHA-512', 'SHA-1'].map((a, i) => `<button class="hash-tab ${i === 0 ? 'active' : ''}" onclick="setHashAlgo('${a}',this)">${a}</button>`).join('')}
    </div>
    <textarea id="hash-input" placeholder="Enter text to hash..." oninput="computeHash()"></textarea>
    <div class="hash-output" id="hash-output">Hash will appear here...</div>
    <button onclick="copyText('hash-output')" class="btn btn-ghost mt-2 w-full text-[.8rem]">Copy Hash</button>`;
}
let HASH_ALGO = 'SHA-256';
function setHashAlgo(a, btn) {
  HASH_ALGO = a;
  document.querySelectorAll('.hash-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  computeHash();
}
async function computeHash() {
  const input = document.getElementById('hash-input')?.value || '';
  if (!input) { document.getElementById('hash-output').textContent = 'Hash will appear here...'; return; }
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest(HASH_ALGO, enc);
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  const el = document.getElementById('hash-output');
  if (el) el.textContent = hex;
}

/* -- Base64 -- */
function base64Tool() {
  return `
    <div class="b64-row">
      <div>
        <div class="form-label mb-[5px]">Plain Text</div>
        <textarea id="b64-plain" placeholder="Enter text to encode..." oninput="b64encode()"></textarea>
        <button class="btn btn-ghost mt-1.5 w-full text-[.8rem]" onclick="b64encode()">&rarr; Encode</button>
      </div>
      <div>
        <div class="form-label mb-[5px]">Base64</div>
        <textarea id="b64-encoded" placeholder="Enter Base64 to decode..." oninput="b64decode()"></textarea>
        <button class="btn btn-ghost mt-1.5 w-full text-[.8rem]" onclick="b64decode()">&larr; Decode</button>
      </div>
    </div>`;
}
function b64encode() { const v = document.getElementById('b64-plain')?.value || ''; try { document.getElementById('b64-encoded').value = btoa(unescape(encodeURIComponent(v))); } catch (e) { } }
function b64decode() { const v = document.getElementById('b64-encoded')?.value || ''; try { document.getElementById('b64-plain').value = decodeURIComponent(escape(atob(v))); } catch (e) { document.getElementById('b64-plain').value = 'Invalid Base64'; } }

/* -- UUID Generator -- */
function uuidTool() {
  return `
    <div class="uuid-list" id="uuid-list"></div>
    <div class="tool-actions-row">
      <button class="btn btn-primary flex-1" onclick="genUUIDs()">Generate UUIDs</button>
      <button class="btn btn-ghost" onclick="copyAllUUIDs()">Copy All</button>
    </div>`;
}
function genUUIDs() {
  const list = document.getElementById('uuid-list');
  if (!list) return;
  list.innerHTML = Array.from({ length: 5 }, () => {
    const u = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    return `<div class="uuid-item"><span class="uuid-text">${u}</span><button class="copy-icon-btn" onclick="navigator.clipboard.writeText('${u}').then(()=>toast('Copied!'))"><svg class="icon-3_25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>`;
  }).join('');
}
function copyAllUUIDs() {
  const texts = [...document.querySelectorAll('#uuid-list .uuid-text')].map(e => e.textContent);
  navigator.clipboard.writeText(texts.join('\n')).then(() => toast('All UUIDs copied!'));
}

/* -- Color Tool -- */
function colorTool() {
  return `
    <input class="color-picker-input" type="color" id="color-picker" value="#00d4b4" oninput="updateColor()"/>
    <div class="color-preview" id="color-preview"></div>
    <div class="color-formats" id="color-formats"></div>`;
}
function updateColor() {
  const hex = document.getElementById('color-picker')?.value || '#00d4b4';
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const r1 = r / 255, g1 = g / 255, b1 = b / 255;
  const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) { const d = max - min; s = l > .5 ? d / (2 - max - min) : d / (max + min); switch (max) { case r1: h = ((g1 - b1) / d + (g1 < b1 ? 6 : 0)) / 6; break; case g1: h = ((b1 - r1) / d + 2) / 6; break; case b1: h = ((r1 - g1) / d + 4) / 6; break; } }
  const hsl = `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const prev = document.getElementById('color-preview');
  if (prev) { prev.style.background = hex; prev.style.color = luma > 128 ? '#000' : '#fff'; prev.textContent = hex.toUpperCase(); }
  const fmts = document.getElementById('color-formats');
  if (fmts) fmts.innerHTML = [
    { label: 'HEX', val: hex.toUpperCase() },
    { label: 'RGB', val: `rgb(${r}, ${g}, ${b})` },
    { label: 'HSL', val: hsl },
  ].map(f => `<div class="color-fmt"><span class="color-fmt-label">${f.label}</span><span class="color-fmt-val">${f.val}</span><button class="copy-icon-btn ml-auto" onclick="navigator.clipboard.writeText('${f.val}').then(()=>toast('Copied!'))"><svg class="icon-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>`).join('');
}

/* -- JSON Formatter -- */
function jsonTool() {
  return `
    <textarea id="json-input" class="json-input" placeholder="Paste JSON here..." oninput="formatJSON()"></textarea>
    <div class="json-actions">
      <button class="btn btn-primary flex-1 text-[.82rem]" onclick="formatJSON()">Format</button>
      <button class="btn btn-ghost flex-1 text-[.82rem]" onclick="minifyJSON()">Minify</button>
      <button class="btn btn-ghost text-[.82rem]" onclick="copyText('json-output')">Copy</button>
    </div>
    <div id="json-status" class="json-status"></div>
    <pre class="json-output" id="json-output"></pre>`;
}
function formatJSON() {
  const v = document.getElementById('json-input')?.value || '';
  if (!v) { document.getElementById('json-output').textContent = ''; document.getElementById('json-status').textContent = ''; return; }
  try {
    const parsed = JSON.parse(v);
    document.getElementById('json-output').textContent = JSON.stringify(parsed, null, 2);
    document.getElementById('json-status').innerHTML = '<span class="json-status-ok">Valid JSON</span>';
  } catch (e) {
    document.getElementById('json-status').innerHTML = `<span class="json-status-error">${e.message}</span>`;
    document.getElementById('json-output').textContent = '';
  }
}
function minifyJSON() {
  const v = document.getElementById('json-input')?.value || '';
  try { document.getElementById('json-output').textContent = JSON.stringify(JSON.parse(v)); } catch (e) { }
}
