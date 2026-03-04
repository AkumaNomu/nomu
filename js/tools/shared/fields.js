import { escapeHtml } from './dom.js';

function renderHelp(help) {
  if (!help) return '';
  return `<div class="tool-help">${escapeHtml(help)}</div>`;
}

function renderError(err, fieldId) {
  return `<div class="tool-error" role="alert" data-error-for="${fieldId}">${err ? escapeHtml(err) : ''}</div>`;
}

function renderLabel(field, id) {
  const label = field.label ? `<label class="tool-field-label" for="${id}">${escapeHtml(field.label)}</label>` : '';
  return label;
}

function getOptions(field, state) {
  if (typeof field.options === 'function') return field.options(state) || [];
  return field.options || [];
}

export function renderField(field, value, error, state = {}) {
  const id = `field-${field.id}`;
  const disabled = field.disabled ? 'disabled' : '';
  const required = field.required ? 'required' : '';
  const ariaInvalid = error ? 'aria-invalid="true"' : '';
  const dataAttr = `data-field-id="${field.id}"`;

  if (field.type === 'toggle') {
    const checked = value ? 'checked' : '';
    return `
      <div class="tool-field tool-field-toggle">
        <label class="tool-check">
          <input type="checkbox" id="${id}" ${checked} ${dataAttr} ${disabled} ${required} ${ariaInvalid} />
          ${escapeHtml(field.label || '')}
        </label>
        ${renderHelp(field.help)}
        ${renderError(error, field.id)}
      </div>`;
  }

  if (field.type === 'select') {
    const options = getOptions(field, state).map(opt => {
      const val = typeof opt === 'string' ? opt : opt.value;
      const label = typeof opt === 'string' ? opt : opt.label;
      const selected = String(val) === String(value) ? 'selected' : '';
      return `<option value="${escapeHtml(val)}" ${selected}>${escapeHtml(label)}</option>`;
    }).join('');
    return `
      <div class="tool-field">
        ${renderLabel(field, id)}
        <select id="${id}" ${dataAttr} ${disabled} ${required} ${ariaInvalid}>
          ${options}
        </select>
        ${renderHelp(field.help)}
        ${renderError(error, field.id)}
      </div>`;
  }

  if (field.type === 'textarea') {
    return `
      <div class="tool-field">
        ${renderLabel(field, id)}
        <textarea id="${id}" ${dataAttr} ${disabled} ${required} ${ariaInvalid} placeholder="${escapeHtml(field.placeholder || '')}">${escapeHtml(value ?? '')}</textarea>
        ${renderHelp(field.help)}
        ${renderError(error, field.id)}
      </div>`;
  }

  if (field.type === 'range') {
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    const step = field.step ?? 1;
    return `
      <div class="tool-field">
        ${renderLabel(field, id)}
        <input type="range" id="${id}" ${dataAttr} min="${min}" max="${max}" step="${step}" value="${escapeHtml(value ?? '')}" />
        ${renderHelp(field.help)}
        ${renderError(error, field.id)}
      </div>`;
  }

  if (field.type === 'file') {
    const accept = field.accept ? `accept="${escapeHtml(field.accept)}"` : '';
    return `
      <div class="tool-field">
        ${renderLabel(field, id)}
        <input type="file" id="${id}" ${dataAttr} ${accept} ${disabled} ${required} ${ariaInvalid} />
        ${renderHelp(field.help)}
        ${renderError(error, field.id)}
      </div>`;
  }

  const type = field.type === 'number' ? 'number' : (field.type || 'text');
  const min = field.min !== undefined ? `min="${field.min}"` : '';
  const max = field.max !== undefined ? `max="${field.max}"` : '';
  const step = field.step !== undefined ? `step="${field.step}"` : '';

  return `
    <div class="tool-field">
      ${renderLabel(field, id)}
      <input type="${type}" id="${id}" ${dataAttr} ${disabled} ${required} ${ariaInvalid} ${min} ${max} ${step} value="${escapeHtml(value ?? '')}" placeholder="${escapeHtml(field.placeholder || '')}" />
      ${renderHelp(field.help)}
      ${renderError(error, field.id)}
    </div>`;
}

export function buildDefaultState(schema) {
  const state = {};
  if (!schema) return state;
  const fields = schema.fields || [];
  fields.forEach(field => {
    if (field.default !== undefined) state[field.id] = field.default;
    else if (field.type === 'toggle') state[field.id] = false;
    else state[field.id] = '';
  });
  if (schema.input) {
    const input = schema.input;
    state[input.id] = input.default !== undefined ? input.default : '';
  }
  return state;
}

export function normalizeOptions(field, state) {
  if (!field || field.type !== 'select') return state;
  const options = getOptions(field, state);
  if (!options.length) return state;
  const values = options.map(opt => (typeof opt === 'string' ? opt : opt.value));
  if (!values.includes(state[field.id])) {
    return { ...state, [field.id]: values[0] };
  }
  return state;
}
