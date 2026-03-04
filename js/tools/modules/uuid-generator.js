function generateUuid() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

export const meta = {
  id: 'uuid-generator',
  name: 'UUID Generator',
  description: 'Generate UUID v4 values in bulk.',
  keywords: 'uuid v4 random',
  category: 'Generators',
  icon: 'fingerprint',
  inputType: 'none',
  supportsCopy: true,
  supportsDownload: true,
};

export const schema = {
  fields: [
    { id: 'count', type: 'number', label: 'How many?', min: 1, max: 20, step: 1, default: 5 },
  ],
  output: {
    id: 'result',
    label: 'UUIDs',
    type: 'textarea',
    placeholder: 'Generated UUIDs will appear here',
  },
  runMode: 'manual',
  runLabel: 'Generate UUIDs',
};

export function compute(state) {
  const count = Math.min(Math.max(Number(state.count) || 1, 1), 50);
  const list = Array.from({ length: count }, generateUuid).join('\n');
  return { output: { result: list } };
}
