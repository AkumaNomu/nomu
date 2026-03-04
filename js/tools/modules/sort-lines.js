export const meta = {
  id: 'sort-lines',
  name: 'Sort Lines',
  description: 'Sort lines alphabetically or numerically.',
  keywords: 'sort lines asc desc',
  category: 'Text Tools',
  icon: 'code',
  inputType: 'text',
  supportsCopy: true,
  supportsDownload: false,
};

export const schema = {
  fields: [
    { id: 'direction', type: 'select', label: 'Direction', default: 'asc', options: [
      { value: 'asc', label: 'Ascending' },
      { value: 'desc', label: 'Descending' },
    ] },
    { id: 'numeric', type: 'toggle', label: 'Numeric sort', default: false },
    { id: 'caseSensitive', type: 'toggle', label: 'Case sensitive', default: false },
  ],
  input: {
    id: 'value',
    type: 'textarea',
    label: 'Lines',
    placeholder: 'Paste lines to sort...',
    default: '',
  },
  output: {
    id: 'result',
    label: 'Sorted Lines',
    type: 'textarea',
    placeholder: 'Sorted lines will appear here',
  },
};

export function compute(state) {
  const input = state.value || '';
  if (!input) return { output: { result: '' } };
  const lines = input.split(/\r?\n/);
  const dir = state.direction === 'desc' ? -1 : 1;
  const sorted = lines.slice().sort((a, b) => {
    if (state.numeric) {
      const na = parseFloat(a);
      const nb = parseFloat(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return (na - nb) * dir;
    }
    const aa = state.caseSensitive ? a : a.toLowerCase();
    const bb = state.caseSensitive ? b : b.toLowerCase();
    if (aa < bb) return -1 * dir;
    if (aa > bb) return 1 * dir;
    return 0;
  });
  return { output: { result: sorted.join('\n') } };
}
