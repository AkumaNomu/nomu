export const meta = {
  id: 'password-generator',
  name: 'Password Generator',
  description: 'Create secure random passwords with custom rules.',
  keywords: 'password random secure',
  category: 'Generators',
  icon: 'key',
  inputType: 'none',
  supportsCopy: true,
  supportsDownload: false,
};

export const schema = {
  fields: [
    { id: 'length', type: 'range', label: 'Length', min: 8, max: 64, step: 1, default: 16 },
    { id: 'uppercase', type: 'toggle', label: 'Uppercase (A-Z)', default: true },
    { id: 'lowercase', type: 'toggle', label: 'Lowercase (a-z)', default: true },
    { id: 'numbers', type: 'toggle', label: 'Numbers (0-9)', default: true },
    { id: 'symbols', type: 'toggle', label: 'Symbols (!@#$)', default: false },
  ],
  output: {
    id: 'result',
    label: 'Password',
    type: 'text',
    placeholder: 'Generate a password',
  },
  runMode: 'manual',
  runLabel: 'Generate Password',
};

export function compute(state) {
  const length = Number(state.length) || 16;
  let chars = '';
  if (state.uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (state.lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (state.numbers) chars += '0123456789';
  if (state.symbols) chars += '!@#$%^&*()-_=+[]{}|;:,.<>?';
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  const pwd = Array.from(buf).map(n => chars[n % chars.length]).join('');
  return { output: { result: pwd } };
}
