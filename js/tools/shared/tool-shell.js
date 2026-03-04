import { renderField } from './fields.js';
import { escapeHtml } from './dom.js';

function renderOutputBlock(output, value) {
  const id = `output-${output.id}`;
  const placeholder = output.placeholder || '';
  const label = output.label ? `<label class="tool-field-label" for="${id}">${escapeHtml(output.label)}</label>` : '';
  const content = value ?? '';

  if (output.type === 'pre') {
    return `
      <div class="tool-output-block">
        ${label}
        <pre id="${id}" class="tool-output-pre" data-output-id="${output.id}" aria-live="polite">${escapeHtml(content)}</pre>
      </div>`;
  }

  return `
    <div class="tool-output-block">
      ${label}
      <textarea id="${id}" class="tool-output" data-output-id="${output.id}" aria-live="polite" readonly placeholder="${escapeHtml(placeholder)}">${escapeHtml(content)}</textarea>
    </div>`;
}

export function renderDefaultBody(schema, state, errors) {
  const fields = (schema.fields || []).map(field => renderField(field, state[field.id], errors?.[field.id], state)).join('');
  const inputField = schema.input
    ? renderField(schema.input, state[schema.input.id], errors?.[schema.input.id], state)
    : '';
  const outputs = schema.outputs
    ? schema.outputs.map(out => renderOutputBlock(out, state.__outputs?.[out.id] ?? '')).join('')
    : schema.output
      ? renderOutputBlock(schema.output, state.__outputs?.[schema.output.id] ?? '')
      : '';

  return `
    <div class="tool-shell-body">
      ${fields ? `<div class="tool-settings">${fields}</div>` : ''}
      ${inputField ? `<div class="tool-input">${inputField}</div>` : ''}
      ${outputs ? `<div class="tool-outputs">${outputs}</div>` : ''}
    </div>`;
}

export function renderToolShell({ tool, bodyHtml, actionsHtml, breadcrumb, iconHtml }) {
  return `
    <div class="tool-shell" data-tool-shell="${escapeHtml(tool.id)}">
      <div class="tool-shell-header">
        ${breadcrumb ? `<div class="tool-breadcrumb">${escapeHtml(breadcrumb)}</div>` : ''}
        <div class="tool-shell-title-row">
          <div class="tool-shell-title-group">
            ${iconHtml || ''}
            <div class="tool-shell-title">${escapeHtml(tool.name)}</div>
          </div>
          <div class="tool-shell-category">${escapeHtml(tool.category)}</div>
        </div>
        <div class="tool-shell-desc">${escapeHtml(tool.description || '')}</div>
      </div>
      <div class="tool-shell-actions">
        <button class="btn btn-ghost tool-rail-toggle" type="button" data-tool-action="open-list">Tools list</button>
        <button class="btn btn-ghost tool-back-btn" type="button" data-tool-action="back">Back to list</button>
        ${actionsHtml || ''}
      </div>
      ${bodyHtml}
    </div>`;
}
