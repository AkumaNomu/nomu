const TIMEZONES = (typeof Intl !== 'undefined' && Intl.supportedValuesOf)
  ? Intl.supportedValuesOf('timeZone')
  : [Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'];

export const meta = {
  id: 'timestamp-converter',
  name: 'Timestamp Converter',
  description: 'Convert Unix timestamps to human time and back.',
  keywords: 'unix epoch time timezone',
  category: 'Converters',
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
      label: 'Conversion',
      default: 'unix_to_human',
      options: [
        { value: 'unix_to_human', label: 'Unix → Human' },
        { value: 'human_to_unix', label: 'Human → Unix' },
      ],
    },
    {
      id: 'unit',
      type: 'select',
      label: 'Unix Unit',
      default: 'seconds',
      options: [
        { value: 'seconds', label: 'Seconds' },
        { value: 'milliseconds', label: 'Milliseconds' },
      ],
    },
    {
      id: 'timezone',
      type: 'select',
      label: 'Timezone',
      default: TIMEZONES[0] || 'UTC',
      options: TIMEZONES,
    },
  ],
  input: {
    id: 'value',
    type: 'text',
    label: 'Input',
    placeholder: 'Unix timestamp or 2026-03-04T12:00',
    default: '',
    help: 'Human input uses your browser locale for parsing. Timezone is applied for display.',
  },
  outputs: [
    { id: 'human', label: 'Human', type: 'text', placeholder: 'Readable time' },
    { id: 'iso', label: 'ISO', type: 'text', placeholder: 'ISO time' },
    { id: 'unix', label: 'Unix', type: 'text', placeholder: 'Unix timestamp' },
  ],
};

export function compute(state) {
  const mode = state.mode;
  const unit = state.unit;
  const tz = state.timezone;
  const value = (state.value || '').trim();
  if (!value) return { output: { human: '', iso: '', unix: '' } };

  if (mode === 'unix_to_human') {
    const num = Number(value);
    if (!Number.isFinite(num)) return { output: { human: '', iso: '', unix: '' } };
    const ms = unit === 'seconds' ? num * 1000 : num;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return { output: { human: '', iso: '', unix: '' } };
    const human = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: tz,
    }).format(date);
    return {
      output: {
        human,
        iso: date.toISOString(),
        unix: unit === 'seconds' ? Math.floor(ms / 1000).toString() : ms.toString(),
      },
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { output: { human: '', iso: '', unix: '' } };
  const ms = date.getTime();
  const unix = unit === 'seconds' ? Math.floor(ms / 1000) : ms;
  const human = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: tz,
  }).format(date);
  return {
    output: {
      human,
      iso: date.toISOString(),
      unix: unix.toString(),
    },
  };
}
