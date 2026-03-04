export const meta = {
  id: 'json-formatter',
  name: 'JSON Formatter & Validator',
  description: 'Format, validate, and minify JSON.',
  keywords: 'json format validate minify',
  category: 'Developer Tools',
  icon: 'braces',
  inputType: 'text',
  supportsCopy: true,
  supportsDownload: true,
};

export const schema = {
  fields: [
    {
      id: 'mode',
      type: 'select',
      label: 'Mode',
      default: 'pretty',
      options: [
        { value: 'pretty', label: 'Pretty format' },
        { value: 'minify', label: 'Minify' },
      ],
    },
  ],
  input: {
    id: 'value',
    type: 'textarea',
    label: 'JSON Input',
    placeholder: '{ "hello": "world" }',
    default: '',
  },
  output: {
    id: 'result',
    label: 'Output',
    type: 'textarea',
    placeholder: 'Formatted JSON will appear here',
  },
};

export function validate(state) {
  const errors = {};
  if (!state.value) return errors;
  try {
    JSON.parse(state.value);
  } catch (err) {
    errors.value = err.message || 'Invalid JSON.';
  }
  return errors;
}

export function compute(state) {
  if (!state.value) return { output: { result: '' } };
  try {
    const parsed = JSON.parse(state.value);
    const output = state.mode === 'minify'
      ? JSON.stringify(parsed)
      : JSON.stringify(parsed, null, 2);
    return { output: { result: output } };
  } catch (_) {
    return { output: { result: '' } };
  }
}
