export const meta = {
  id: 'jwt-decoder',
  name: 'JWT Decoder',
  description: 'Decode JWT header and payload (no verification).',
  keywords: 'jwt decode token',
  category: 'Developer Tools',
  icon: 'fingerprint',
  inputType: 'text',
  supportsCopy: true,
  supportsDownload: false,
};

export const schema = {
  input: {
    id: 'value',
    type: 'textarea',
    label: 'JWT',
    placeholder: 'Paste JWT here...',
    default: '',
  },
  outputs: [
    { id: 'header', label: 'Header', type: 'textarea', placeholder: 'Decoded header' },
    { id: 'payload', label: 'Payload', type: 'textarea', placeholder: 'Decoded payload' },
  ],
};

function base64UrlDecode(str) {
  const pad = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = pad + '==='.slice((pad.length + 3) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

export function validate(state) {
  const errors = {};
  if (!state.value) return errors;
  const parts = state.value.split('.');
  if (parts.length !== 3) {
    errors.value = 'JWT should have three dot-separated parts.';
  }
  return errors;
}

export function compute(state) {
  const token = (state.value || '').trim();
  if (!token) return { output: { header: '', payload: '' } };
  const parts = token.split('.');
  if (parts.length < 2) return { output: { header: '', payload: '' } };
  try {
    const header = JSON.stringify(JSON.parse(base64UrlDecode(parts[0])), null, 2);
    const payload = JSON.stringify(JSON.parse(base64UrlDecode(parts[1])), null, 2);
    return { output: { header, payload } };
  } catch (_) {
    return { output: { header: '', payload: '' } };
  }
}
