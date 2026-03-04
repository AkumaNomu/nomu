export const meta = {
  id: 'hash-generator',
  name: 'Hash Generator',
  description: 'Generate SHA-256 or SHA-512 hashes.',
  keywords: 'hash sha256 sha512 crypto',
  category: 'Security & Crypto',
  icon: 'hash',
  inputType: 'text',
  supportsCopy: true,
  supportsDownload: false,
};

export const schema = {
  fields: [
    {
      id: 'algorithm',
      type: 'select',
      label: 'Algorithm',
      default: 'SHA-256',
      options: [
        { value: 'SHA-256', label: 'SHA-256' },
        { value: 'SHA-512', label: 'SHA-512' },
      ],
    },
  ],
  input: {
    id: 'value',
    type: 'textarea',
    label: 'Input',
    placeholder: 'Enter text to hash...',
    default: '',
  },
  output: {
    id: 'result',
    label: 'Hash',
    type: 'text',
    placeholder: 'Hash will appear here',
  },
};

export async function compute(state) {
  const input = state.value || '';
  if (!input) return { output: { result: '' } };
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest(state.algorithm || 'SHA-256', data);
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { output: { result: hex } };
}
