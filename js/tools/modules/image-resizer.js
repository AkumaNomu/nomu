import { renderField } from '../shared/fields.js';
import { formatFileSize } from '../shared/format.js';

export const meta = {
  id: 'image-resizer',
  name: 'Image Resizer & Compressor',
  description: 'Resize and compress images locally.',
  keywords: 'image resize compress jpg png webp',
  category: 'Image Tools',
  icon: 'palette',
  inputType: 'file',
  supportsCopy: false,
  supportsDownload: true,
};

export const schema = {
  fields: [
    {
      id: 'file',
      type: 'file',
      label: 'Choose Image',
      accept: 'image/png,image/jpeg,image/webp',
      persist: false,
      help: 'PNG, JPG, or WebP. Files stay on your device.',
    },
    { id: 'width', type: 'number', label: 'Width (px)', min: 1, step: 1, default: 800 },
    { id: 'height', type: 'number', label: 'Height (px)', min: 1, step: 1, default: 600 },
    { id: 'lockAspect', type: 'toggle', label: 'Lock aspect ratio', default: true },
    {
      id: 'format',
      type: 'select',
      label: 'Output format',
      default: 'image/jpeg',
      options: [
        { value: 'image/jpeg', label: 'JPG' },
        { value: 'image/png', label: 'PNG' },
        { value: 'image/webp', label: 'WebP' },
      ],
    },
    { id: 'quality', type: 'range', label: 'Quality', min: 0.4, max: 1, step: 0.05, default: 0.85 },
  ],
  runMode: 'auto',
};

export function render({ schema, state }) {
  const fieldsHtml = (schema.fields || []).map(field => renderField(field, state[field.id], '', state)).join('');
  return `
    <div class="tool-shell-body">
      <div class="tool-settings">${fieldsHtml}</div>
      <div class="tool-outputs">
        <div class="tool-image-preview">
          <img id="image-preview" alt="Image preview" />
          <div class="tool-image-hint">Select an image to preview the output.</div>
        </div>
        <div class="tool-image-info" data-output-id="info"></div>
      </div>
    </div>`;
}

export async function compute(state, runtime) {
  const file = runtime.file;
  if (!file) {
    if (runtime.imageUrl) URL.revokeObjectURL(runtime.imageUrl);
    runtime.imageUrl = null;
    runtime.imageBlob = null;
    runtime.imageMeta = null;
    return { output: { info: '' } };
  }
  const bitmap = await createImageBitmap(file);
  let width = Number(state.width) || bitmap.width;
  let height = Number(state.height) || bitmap.height;
  if (state.lockAspect) {
    const ratio = bitmap.width / bitmap.height;
    if (width && !height) height = Math.round(width / ratio);
    if (height && !width) width = Math.round(height * ratio);
    if (width && height) height = Math.round(width / ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);

  const format = state.format || 'image/jpeg';
  const quality = format === 'image/png' ? undefined : Number(state.quality) || 0.85;
  const blob = await new Promise(resolve => canvas.toBlob(resolve, format, quality));
  if (!blob) return { output: { info: '' } };

  if (runtime.imageUrl) URL.revokeObjectURL(runtime.imageUrl);
  const dataUrl = URL.createObjectURL(blob);
  runtime.imageUrl = dataUrl;
  runtime.imageBlob = blob;
  runtime.imageMeta = { width, height, size: blob.size, type: blob.type };
  const info = `${width} × ${height} · ${formatFileSize(blob.size)} · ${blob.type.replace('image/', '').toUpperCase()}`;
  return { output: { info } };
}

export function onComputed({ panel, runtime, outputs }) {
  const img = panel.querySelector('#image-preview');
  const hint = panel.querySelector('.tool-image-hint');
  if (!img) return;
  if (!runtime.imageUrl) {
    img.removeAttribute('src');
    if (hint) hint.style.display = '';
    return;
  }
  img.src = runtime.imageUrl;
  if (hint) hint.style.display = 'none';
  const infoEl = panel.querySelector('[data-output-id="info"]');
  if (infoEl) infoEl.textContent = outputs?.info || '';
}

export async function getDownload({ runtime }) {
  if (!runtime.imageBlob) return null;
  const ext = (runtime.imageMeta?.type || 'image/png').split('/')[1] || 'png';
  return {
    filename: `resized-${Date.now()}.${ext}`,
    blob: runtime.imageBlob,
  };
}

export function onReset({ runtime }) {
  if (runtime.imageUrl) URL.revokeObjectURL(runtime.imageUrl);
  runtime.imageUrl = null;
  runtime.imageBlob = null;
  runtime.imageMeta = null;
  runtime.file = null;
}
