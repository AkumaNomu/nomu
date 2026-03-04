export const meta = {
  id: 'base-converter',
  name: 'Number Base Converter',
  description: 'Convert numbers between binary, decimal, and hex.',
  keywords: 'binary decimal hex base',
  category: 'Converters',
  icon: 'braces',
  inputType: 'text',
  supportsCopy: true,
  supportsDownload: false,
};

const BASE_OPTIONS = [
  { value: 2, label: 'Binary (base 2)' },
  { value: 10, label: 'Decimal (base 10)' },
  { value: 16, label: 'Hex (base 16)' },
];

export const schema = {
  fields: [
    { id: 'fromBase', type: 'select', label: 'From Base', default: 10, options: BASE_OPTIONS },
    { id: 'toBase', type: 'select', label: 'To Base', default: 2, options: BASE_OPTIONS },
  ],
  input: {
    id: 'value',
    type: 'text',
    label: 'Number',
    placeholder: 'Enter a number (e.g., 101010)',
    default: '',
  },
  output: {
    id: 'result',
    label: 'Converted',
    type: 'text',
    placeholder: 'Converted value',
  },
  supportsSwap: true,
};

export function swap(state) {
  return { ...state, fromBase: state.toBase, toBase: state.fromBase };
}

function isValidForBase(value, base) {
  const allowed = {
    2: /^[01]+$/i,
    10: /^[0-9]+$/i,
    16: /^[0-9a-f]+$/i,
  };
  return allowed[base]?.test(value.trim());
}

export function validate(state) {
  const errors = {};
  if (!state.value) return errors;
  if (!isValidForBase(state.value, Number(state.fromBase))) {
    errors.value = 'This value is not valid for the selected base.';
  }
  return errors;
}

export function compute(state) {
  const value = (state.value || '').trim();
  if (!value) return { output: { result: '' } };
  if (!isValidForBase(value, Number(state.fromBase))) return { output: { result: '' } };
  const num = parseInt(value, Number(state.fromBase));
  if (!Number.isFinite(num)) return { output: { result: '' } };
  return { output: { result: num.toString(Number(state.toBase)).toUpperCase() } };
}
