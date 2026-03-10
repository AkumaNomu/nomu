import { emitToast } from '../shared/dom.js';

export const schema = {
  fields: [
    { id: 'file', type: 'file', default: '', persist: false },
    { id: 'format', type: 'select', default: 'image/png' , options: [{label:'PNG',value:'image/png'},{label:'JPEG',value:'image/jpeg'},{label:'WEBP',value:'image/webp'}]},
    { id: 'quality', type: 'number', default: 0.92, min: 0.1, max: 1, step: 0.01 },
    { id: 'width', type: 'number', default: '', min: 1 },
    { id: 'height', type: 'number', default: '', min: 1 },
    { id: 'keepAspect', type: 'toggle', default: true },
  ],
  outputs: [ { id: 'preview' } ],
  runMode: 'manual',
};

export function render({ tool }) {
  return `
    <div class="imgtool-card">
      <div class="imgtool-header">
        <div class="imgtool-title">${tool.name}</div>
        <button class="imgtool-reset" type="button" data-tool-action="reset">Reset</button>
      </div>

      <div class="imgtool-body">
        <label class="tool-field">
          <span>Image file</span>
          <input type="file" accept="image/*" data-field-id="file" />
        </label>

        <div class="imgtool-grid">
          <label class="tool-field">
            <span>Format</span>
            <select data-field-id="format">
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPEG</option>
              <option value="image/webp">WEBP</option>
            </select>
          </label>
          <label class="tool-field">
            <span>Quality (JPEG/WEBP)</span>
            <input type="number" min="0.1" max="1" step="0.01" data-field-id="quality" />
          </label>
        </div>

        <div class="imgtool-grid">
          <label class="tool-field">
            <span>Width (px)</span>
            <input type="number" data-field-id="width" placeholder="auto" />
          </label>
          <label class="tool-field">
            <span>Height (px)</span>
            <input type="number" data-field-id="height" placeholder="auto" />
          </label>
        </div>

        <label class="tool-field">
          <input type="checkbox" data-field-id="keepAspect" /> Keep aspect ratio
        </label>

        <div class="imgtool-output">
          <div class="img-preview">
            <img data-output-id="preview" alt="Preview" style="max-width:100%;display:block;" />
          </div>
        </div>

      </div>

      <div class="tool-error" data-error-for="_global"></div>
    </div>
  `;
}

export async function mount({ panel, runtime }) {
  if (!panel) return;
  const fileInput = panel.querySelector('[data-field-id="file"]');
  fileInput?.addEventListener('change', e => {
    runtime.file = e.target.files?.[0] || null;
  });

  panel.addEventListener('click', async e => {
    const btn = e.target.closest('[data-tool-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-tool-action');
    if (action === 'reset') {
      runtime.file = null;
      const img = panel.querySelector('[data-output-id="preview"]');
      if (img) img.src = '';
      emitToast('Reset');
    }
  });
}

export async function compute(state, runtime) {
  if (!runtime.file) return { outputs: {} };
  try {
    const file = runtime.file;
    const imgBitmap = await createImageBitmap(file);
    const origW = imgBitmap.width;
    const origH = imgBitmap.height;

    let targetW = Number(state.width) || origW;
    let targetH = Number(state.height) || origH;

    if (state.keepAspect) {
      if (state.width && !state.height) {
        targetW = Number(state.width);
        targetH = Math.round((targetW / origW) * origH);
      } else if (state.height && !state.width) {
        targetH = Number(state.height);
        targetW = Math.round((targetH / origH) * origW);
      } else if (!state.width && !state.height) {
        targetW = origW; targetH = origH;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgBitmap, 0, 0, targetW, targetH);

    const fmt = state.format || 'image/png';
    const quality = typeof state.quality === 'number' ? state.quality : 0.92;
    const dataUrl = canvas.toDataURL(fmt, quality);

    return { outputs: { preview: dataUrl } };
  } catch (err) {
    return { outputs: {}, error: err.message || 'Failed to convert image' };
  }
}

export async function getDownload({ state, runtime, tool }) {
  const dataUrl = state.__outputs?.preview;
  if (!dataUrl) return null;
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = (state.format || 'image/png').split('/')[1] || 'png';
  return {
    filename: `${tool.id || 'image'}-converted.${ext}`,
    blob,
  };
}
