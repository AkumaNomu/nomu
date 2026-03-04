export const meta = {
  id: 'text-encoding',
  name: 'Text Encoding Converter',
  description: 'Base64, URL, and HTML encoding/decoding.',
  keywords: 'base64 url html encode decode',
  category: 'Converters',
  icon: 'code',
  inputType: 'text',
  supportsCopy: true,
  supportsDownload: false,
};

export const schema = {
  fields: [
    {
      id: 'encoding',
      type: 'select',
      label: 'Encoding',
      default: 'base64',
      options: [
        { value: 'base64', label: 'Base64' },
        { value: 'url', label: 'URL' },
        { value: 'html', label: 'HTML' },
      ],
    },
    {
      id: 'direction',
      type: 'select',
      label: 'Direction',
      default: 'encode',
      options: [
        { value: 'encode', label: 'Encode' },
        { value: 'decode', label: 'Decode' },
      ],
    },
  ],
  input: {
    id: 'value',
    type: 'textarea',
    label: 'Input',
    placeholder: 'Enter text to encode or decode...',
    default: '',
  },
  output: {
    id: 'result',
    label: 'Output',
    type: 'textarea',
    placeholder: 'Output will appear here',
  },
};

function htmlEncode(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function htmlDecode(str) {
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent || '';
}

export function compute(state) {
  const input = state.value || '';
  if (!input) return { output: { result: '' } };
  let output = '';
  try {
    switch (state.encoding) {
      case 'base64':
        output = state.direction === 'encode'
          ? btoa(unescape(encodeURIComponent(input)))
          : decodeURIComponent(escape(atob(input)));
        break;
      case 'url':
        output = state.direction === 'encode'
          ? encodeURIComponent(input)
          : decodeURIComponent(input);
        break;
      case 'html':
        output = state.direction === 'encode'
          ? htmlEncode(input)
          : htmlDecode(input);
        break;
      default:
        output = input;
    }
  } catch (_) {
    output = '';
  }
  return { output: { result: output } };
}
