export const meta = {
  id: 'csv-json',
  name: 'CSV ↔ JSON Converter',
  description: 'Convert CSV to JSON and JSON to CSV.',
  keywords: 'csv json convert',
  category: 'Data & Files',
  icon: 'braces',
  inputType: 'text',
  supportsCopy: true,
  supportsDownload: true,
};

export const schema = {
  fields: [
    {
      id: 'mode',
      type: 'select',
      label: 'Direction',
      default: 'csv_to_json',
      options: [
        { value: 'csv_to_json', label: 'CSV → JSON' },
        { value: 'json_to_csv', label: 'JSON → CSV' },
      ],
    },
    {
      id: 'delimiter',
      type: 'select',
      label: 'Delimiter',
      default: ',',
      options: [
        { value: ',', label: 'Comma' },
        { value: ';', label: 'Semicolon' },
        { value: '\t', label: 'Tab' },
      ],
    },
  ],
  input: {
    id: 'value',
    type: 'textarea',
    label: 'Input',
    placeholder: 'Paste CSV or JSON here...',
    default: '',
  },
  output: {
    id: 'result',
    label: 'Output',
    type: 'textarea',
    placeholder: 'Converted output will appear here',
  },
};

function parseCsv(text, delimiter) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  const out = [];
  const pushCell = () => {
    out.push(current);
    current = '';
  };
  const pushRow = () => {
    rows.push(out.slice());
    out.length = 0;
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      pushCell();
      continue;
    }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') i += 1;
      pushCell();
      pushRow();
      continue;
    }
    current += ch;
  }
  pushCell();
  if (out.length) pushRow();
  return rows;
}

function toCsv(rows, delimiter) {
  return rows.map(row => row.map(value => {
    const str = value == null ? '' : String(value);
    if (str.includes('"') || str.includes(delimiter) || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }).join(delimiter)).join('\n');
}

export function compute(state) {
  const input = state.value || '';
  if (!input) return { output: { result: '' } };
  const delimiter = state.delimiter === '\t' ? '\t' : state.delimiter;

  if (state.mode === 'csv_to_json') {
    const rows = parseCsv(input, delimiter);
    if (!rows.length) return { output: { result: '' } };
    const header = rows[0];
    const data = rows.slice(1).filter(r => r.length && r.some(cell => cell !== '')).map(row => {
      const obj = {};
      header.forEach((key, idx) => {
        obj[key] = row[idx] ?? '';
      });
      return obj;
    });
    return { output: { result: JSON.stringify(data, null, 2) } };
  }

  try {
    const parsed = JSON.parse(input);
    const array = Array.isArray(parsed) ? parsed : [parsed];
    const keys = Array.from(new Set(array.flatMap(obj => Object.keys(obj || {}))));
    const rows = [keys, ...array.map(obj => keys.map(k => obj?.[k] ?? ''))];
    return { output: { result: toCsv(rows, delimiter) } };
  } catch (_) {
    return { output: { result: '' } };
  }
}
