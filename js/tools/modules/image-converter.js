function clamp(value, min, max) {
  let num = Number(value);
  if (Number.isNaN(num)) num = 0;
  return Math.min(max, Math.max(min, num));
}

function fmtBytes(bytes) {
  const num = Number(bytes || 0);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

function getOutputExt(format) {
  const short = String(format || 'image/png').split('/')[1] || 'png';
  if (short === 'jpeg') return 'jpg';
  return short;
}

function toBlob(canvas, format, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, format, quality));
}

function resetRuntime(runtime) {
  if (runtime.previewUrl) URL.revokeObjectURL(runtime.previewUrl);
  runtime.previewUrl = '';
  runtime.outputBlob = null;
  runtime.outputName = '';
}

function updatePreview(panel, runtime) {
  const img = panel?.querySelector('[data-image-preview]');
  const info = panel?.querySelector('[data-image-info]');
  if (!img) return;
  img.src = runtime.previewUrl || '';
  if (info) info.textContent = runtime.infoText || 'No output yet.';
}

export const schema = {
  fields: [
    { id: 'file', type: 'file', default: '', persist: false, label: 'Image file', accept: 'image/*' },
    {
      id: 'format',
      type: 'select',
      default: 'image/webp',
      label: 'Output format',
      options: [
        { label: 'WebP', value: 'image/webp' },
        { label: 'JPEG', value: 'image/jpeg' },
        { label: 'PNG', value: 'image/png' },
      ],
    },
    { id: 'quality', type: 'range', default: 0.82, min: 0.1, max: 1, step: 0.01, label: 'Quality (JPEG/WebP)' },
    { id: 'maxWidth', type: 'number', default: 1920, min: 1, max: 10000, step: 1, label: 'Max width (px)' },
    { id: 'maxHeight', type: 'number', default: 1920, min: 1, max: 10000, step: 1, label: 'Max height (px)' },
    { id: 'keepAspect', type: 'toggle', default: true, label: 'Keep aspect ratio' },
  ],
  outputs: [{ id: 'summary', label: 'Summary', type: 'pre' }],
  runMode: 'manual',
};

export function render({ state }) {
  const qualityPct = Math.round(clamp(state.quality, 0.1, 1) * 100);
  return `
    <div class="tool-shell-body">
      <div class="tool-settings">
        <label class="tool-field">
          <span class="tool-field-label">Image file</span>
          <input type="file" accept="image/*" data-field-id="file" />
        </label>
        <div class="tool-field">
          <label class="tool-field-label" for="img-format">Output format</label>
          <select id="img-format" data-field-id="format">
            <option value="image/webp" ${state.format === 'image/webp' ? 'selected' : ''}>WebP</option>
            <option value="image/jpeg" ${state.format === 'image/jpeg' ? 'selected' : ''}>JPEG</option>
            <option value="image/png" ${state.format === 'image/png' ? 'selected' : ''}>PNG</option>
          </select>
        </div>
        <div class="tool-field">
          <label class="tool-field-label" for="img-quality">Quality (JPEG/WebP): ${qualityPct}%</label>
          <input id="img-quality" type="range" min="0.1" max="1" step="0.01" value="${clamp(state.quality, 0.1, 1)}" data-field-id="quality" />
        </div>
        <div class="tool-field">
          <label class="tool-field-label" for="img-max-width">Max width (px)</label>
          <input id="img-max-width" type="number" min="1" max="10000" step="1" value="${Number(state.maxWidth) || ''}" data-field-id="maxWidth" />
        </div>
        <div class="tool-field">
          <label class="tool-field-label" for="img-max-height">Max height (px)</label>
          <input id="img-max-height" type="number" min="1" max="10000" step="1" value="${Number(state.maxHeight) || ''}" data-field-id="maxHeight" />
        </div>
        <label class="tool-check">
          <input type="checkbox" data-field-id="keepAspect" ${state.keepAspect ? 'checked' : ''} />
          Keep aspect ratio
        </label>
      </div>
      <div class="tool-outputs">
        <div class="tool-image-preview">
          <img data-image-preview alt="Converted image preview" />
          <div class="tool-image-info" data-image-info>No output yet.</div>
        </div>
        <div class="tool-output-block">
          <label class="tool-field-label" for="img-summary">Summary</label>
          <pre id="img-summary" class="tool-output-pre" data-output-id="summary"></pre>
        </div>
      </div>
    </div>
  `;
}

export async function compute(state, runtime) {
  if (!runtime.file) {
    resetRuntime(runtime);
    runtime.infoText = 'Choose an image file first.';
    return { outputs: { summary: 'Choose an image file and click Run.' } };
  }

  const bitmap = await createImageBitmap(runtime.file);
  const sourceW = bitmap.width;
  const sourceH = bitmap.height;
  const maxWidth = Number(state.maxWidth) || sourceW;
  const maxHeight = Number(state.maxHeight) || sourceH;

  let targetW = Math.max(1, Math.round(maxWidth));
  let targetH = Math.max(1, Math.round(maxHeight));

  if (state.keepAspect) {
    const ratio = Math.min(maxWidth / sourceW || 1, maxHeight / sourceH || 1, 1);
    targetW = Math.max(1, Math.round(sourceW * ratio));
    targetH = Math.max(1, Math.round(sourceH * ratio));
  }

  if (!state.keepAspect) {
    targetW = Math.min(targetW, sourceW);
    targetH = Math.min(targetH, sourceH);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  const format = state.format || 'image/webp';
  const quality = clamp(state.quality, 0.1, 1);
  const blob = await toBlob(canvas, format, quality);
  if (!blob) {
    resetRuntime(runtime);
    runtime.infoText = 'Failed to encode this image.';
    return { outputs: { summary: 'Encoding failed. Try another format.' } };
  }

  resetRuntime(runtime);
  runtime.outputBlob = blob;
  runtime.outputName = `${(runtime.file.name || 'image').replace(/\.[^/.]+$/, '')}.${getOutputExt(format)}`;
  runtime.previewUrl = URL.createObjectURL(blob);

  const reduction = runtime.file.size > 0
    ? `${Math.max(0, Math.round((1 - blob.size / runtime.file.size) * 100))}% smaller`
    : 'n/a';
  runtime.infoText = `${fmtBytes(runtime.file.size)} -> ${fmtBytes(blob.size)} (${reduction})`;

  const summary = [
    `Input: ${runtime.file.name} (${fmtBytes(runtime.file.size)})`,
    `Output: ${runtime.outputName} (${fmtBytes(blob.size)})`,
    `Dimensions: ${sourceW}x${sourceH} -> ${targetW}x${targetH}`,
    `Format: ${format}`,
    `Quality: ${Math.round(quality * 100)}%`,
    `Compression: ${reduction}`,
  ].join('\n');

  return { outputs: { summary } };
}

export function onComputed({ runtime, panel }) {
  updatePreview(panel, runtime);
}

export function onReset({ runtime, panel }) {
  resetRuntime(runtime);
  runtime.infoText = 'No output yet.';
  updatePreview(panel, runtime);
}

export async function getDownload({ runtime }) {
  if (!runtime.outputBlob) return null;
  return {
    filename: runtime.outputName || 'image-converted.webp',
    blob: runtime.outputBlob,
  };
}
