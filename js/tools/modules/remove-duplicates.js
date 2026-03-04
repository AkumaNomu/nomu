export const meta = {
  id: 'remove-duplicates',
  name: 'Remove Duplicate Lines',
  description: 'Deduplicate text lines with smart options.',
  keywords: 'unique lines dedupe',
  category: 'Text Tools',
  icon: 'code',
  inputType: 'text',
  supportsCopy: true,
  supportsDownload: false,
};

export const schema = {
  fields: [
    { id: 'caseSensitive', type: 'toggle', label: 'Case sensitive', default: false },
    { id: 'trim', type: 'toggle', label: 'Trim whitespace', default: true },
  ],
  input: {
    id: 'value',
    type: 'textarea',
    label: 'Lines',
    placeholder: 'Paste lines to deduplicate...',
    default: '',
  },
  output: {
    id: 'result',
    label: 'Unique Lines',
    type: 'textarea',
    placeholder: 'Unique lines will appear here',
  },
};

export function compute(state) {
  const input = state.value || '';
  if (!input) return { output: { result: '' } };
  const lines = input.split(/\r?\n/);
  const seen = new Set();
  const out = [];
  lines.forEach(line => {
    const raw = state.trim ? line.trim() : line;
    const key = state.caseSensitive ? raw : raw.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(raw);
    }
  });
  return { output: { result: out.join('\n') } };
}
