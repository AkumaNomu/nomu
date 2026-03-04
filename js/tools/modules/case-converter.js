export const meta = {
  id: 'case-converter',
  name: 'Case Converter',
  description: 'Switch between common text casing styles.',
  keywords: 'lower upper title sentence camel snake kebab',
  category: 'Text Tools',
  icon: 'code',
  inputType: 'text',
  supportsCopy: true,
  supportsDownload: false,
};

export const schema = {
  fields: [
    {
      id: 'mode',
      type: 'select',
      label: 'Convert To',
      default: 'lower',
      options: [
        { value: 'lower', label: 'lowercase' },
        { value: 'upper', label: 'UPPERCASE' },
        { value: 'title', label: 'Title Case' },
        { value: 'sentence', label: 'Sentence case' },
        { value: 'camel', label: 'camelCase' },
        { value: 'pascal', label: 'PascalCase' },
        { value: 'snake', label: 'snake_case' },
        { value: 'kebab', label: 'kebab-case' },
      ],
    },
  ],
  input: {
    id: 'value',
    type: 'textarea',
    label: 'Input Text',
    placeholder: 'Paste text here...',
    default: '',
  },
  output: {
    id: 'result',
    label: 'Output',
    type: 'textarea',
    placeholder: 'Converted text',
  },
};

function wordsFrom(text) {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function titleCase(words) {
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function compute(state) {
  const input = state.value || '';
  if (!input) return { output: { result: '' } };
  const words = wordsFrom(input);
  let output = '';
  switch (state.mode) {
    case 'lower':
      output = input.toLowerCase();
      break;
    case 'upper':
      output = input.toUpperCase();
      break;
    case 'title':
      output = titleCase(words);
      break;
    case 'sentence':
      output = input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
      break;
    case 'camel':
      output = words.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
      break;
    case 'pascal':
      output = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
      break;
    case 'snake':
      output = words.map(w => w.toLowerCase()).join('_');
      break;
    case 'kebab':
      output = words.map(w => w.toLowerCase()).join('-');
      break;
    default:
      output = input;
  }
  return { output: { result: output } };
}
