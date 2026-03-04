const UNIT_TYPES = {
  length: {
    label: 'Length',
    units: {
      m: 1,
      km: 1000,
      cm: 0.01,
      mm: 0.001,
      in: 0.0254,
      ft: 0.3048,
      yd: 0.9144,
      mi: 1609.344,
    },
  },
  mass: {
    label: 'Mass',
    units: {
      g: 1,
      kg: 1000,
      mg: 0.001,
      lb: 453.59237,
      oz: 28.349523125,
    },
  },
  time: {
    label: 'Time',
    units: {
      s: 1,
      min: 60,
      h: 3600,
      day: 86400,
      week: 604800,
    },
  },
  data: {
    label: 'Data',
    units: {
      B: 1,
      KB: 1024,
      MB: 1024 ** 2,
      GB: 1024 ** 3,
      TB: 1024 ** 4,
    },
  },
};

const TEMP_UNITS = ['C', 'F', 'K'];

export const meta = {
  id: 'unit-converter',
  name: 'Unit Converter',
  description: 'Convert length, mass, temperature, time, and data units.',
  keywords: 'length mass temperature time data convert',
  category: 'Converters',
  icon: 'code',
  inputType: 'number',
  supportsCopy: true,
  supportsDownload: false,
};

export const schema = {
  fields: [
    {
      id: 'unitType',
      type: 'select',
      label: 'Unit Type',
      default: 'length',
      options: [
        { value: 'length', label: 'Length' },
        { value: 'mass', label: 'Mass' },
        { value: 'temperature', label: 'Temperature' },
        { value: 'time', label: 'Time' },
        { value: 'data', label: 'Data' },
      ],
    },
    {
      id: 'fromUnit',
      type: 'select',
      label: 'From',
      options: state => getUnitOptions(state),
    },
    {
      id: 'toUnit',
      type: 'select',
      label: 'To',
      options: state => getUnitOptions(state),
    },
  ],
  input: {
    id: 'value',
    type: 'number',
    label: 'Value',
    placeholder: 'Enter a number',
    default: 1,
  },
  output: {
    id: 'result',
    label: 'Result',
    type: 'text',
    placeholder: 'Converted value',
  },
  supportsSwap: true,
};

function getUnitOptions(state) {
  if (state.unitType === 'temperature') return TEMP_UNITS;
  const group = UNIT_TYPES[state.unitType] || UNIT_TYPES.length;
  return Object.keys(group.units);
}

function convertTemp(value, from, to) {
  let celsius = value;
  if (from === 'F') celsius = (value - 32) * (5 / 9);
  if (from === 'K') celsius = value - 273.15;
  if (to === 'F') return celsius * (9 / 5) + 32;
  if (to === 'K') return celsius + 273.15;
  return celsius;
}

export function normalize(state) {
  let next = { ...state };
  const opts = getUnitOptions(next);
  if (!opts.includes(next.fromUnit)) next.fromUnit = opts[0];
  if (!opts.includes(next.toUnit)) next.toUnit = opts[1] || opts[0];
  return next;
}

export function swap(state) {
  return { ...state, fromUnit: state.toUnit, toUnit: state.fromUnit };
}

export function compute(state) {
  const value = Number(state.value);
  if (!Number.isFinite(value)) return { output: { result: '' } };

  if (state.unitType === 'temperature') {
    const res = convertTemp(value, state.fromUnit, state.toUnit);
    return { output: { result: String(Number(res.toFixed(6))) } };
  }

  const group = UNIT_TYPES[state.unitType] || UNIT_TYPES.length;
  const fromFactor = group.units[state.fromUnit];
  const toFactor = group.units[state.toUnit];
  if (!fromFactor || !toFactor) return { output: { result: '' } };
  const base = value * fromFactor;
  const result = base / toFactor;
  return { output: { result: String(Number(result.toFixed(6))) } };
}
