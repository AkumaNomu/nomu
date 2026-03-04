export const meta = {
  id: 'date-diff',
  name: 'Date Difference Calculator',
  description: 'Calculate time between two dates.',
  keywords: 'date diff days hours minutes',
  category: 'Calculators',
  icon: 'braces',
  inputType: 'date',
  supportsCopy: true,
  supportsDownload: false,
};

export const schema = {
  fields: [
    { id: 'start', type: 'datetime-local', label: 'Start', default: '' },
    { id: 'end', type: 'datetime-local', label: 'End', default: '' },
  ],
  outputs: [
    { id: 'days', label: 'Days', type: 'text', placeholder: '0' },
    { id: 'hours', label: 'Hours', type: 'text', placeholder: '0' },
    { id: 'minutes', label: 'Minutes', type: 'text', placeholder: '0' },
  ],
};

export function compute(state) {
  if (!state.start || !state.end) return { output: { days: '', hours: '', minutes: '' } };
  const start = new Date(state.start);
  const end = new Date(state.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { output: { days: '', hours: '', minutes: '' } };
  }
  const diffMs = Math.abs(end - start);
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  return { output: { days: String(days), hours: String(hours), minutes: String(minutes) } };
}
