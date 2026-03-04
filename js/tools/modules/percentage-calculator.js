export const meta = {
  id: 'percentage-calculator',
  name: 'Percentage Calculator',
  description: 'Solve common percentage questions quickly.',
  keywords: 'percent percentage math',
  category: 'Calculators',
  icon: 'braces',
  inputType: 'number',
  supportsCopy: true,
  supportsDownload: false,
};

export const schema = {
  fields: [
    {
      id: 'mode',
      type: 'select',
      label: 'Mode',
      default: 'percent_of',
      options: [
        { value: 'percent_of', label: 'X is what % of Y' },
        { value: 'value_from_percent', label: 'Y is X% of what' },
        { value: 'add_subtract', label: 'Add or subtract %' },
      ],
    },
    { id: 'x', type: 'number', label: 'X', default: 0 },
    { id: 'y', type: 'number', label: 'Y', default: 0 },
    { id: 'percent', type: 'number', label: 'Percent', default: 10 },
    {
      id: 'operation',
      type: 'select',
      label: 'Operation',
      default: 'add',
      options: [
        { value: 'add', label: 'Add' },
        { value: 'subtract', label: 'Subtract' },
      ],
    },
  ],
  output: {
    id: 'result',
    label: 'Result',
    type: 'text',
    placeholder: 'Result will appear here',
  },
};

export function compute(state) {
  let result = '';
  const x = Number(state.x);
  const y = Number(state.y);
  const p = Number(state.percent);

  if (state.mode === 'percent_of') {
    if (Number.isFinite(x) && Number.isFinite(y) && y !== 0) {
      result = ((x / y) * 100).toFixed(2) + '%';
    }
  } else if (state.mode === 'value_from_percent') {
    if (Number.isFinite(x) && Number.isFinite(y) && x !== 0) {
      result = (y / (x / 100)).toFixed(2);
    }
  } else if (state.mode === 'add_subtract') {
    if (Number.isFinite(y) && Number.isFinite(p)) {
      const delta = y * (p / 100);
      result = state.operation === 'subtract'
        ? (y - delta).toFixed(2)
        : (y + delta).toFixed(2);
    }
  }

  return { output: { result } };
}
