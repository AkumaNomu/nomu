/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './js/**/*.js',
  ],
  theme: {
    extend: {
      screens: {
        lt1060: { max: '1060px' },
        lt860: { max: '860px' },
      },
      fontFamily: {
        body: ['DM Sans', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
        ui: ['Rajdhani', 'sans-serif'],
      },
      colors: {
        bg: 'var(--bg)',
        bg2: 'var(--bg2)',
        s0: 'var(--s0)',
        s1: 'var(--s1)',
        s2: 'var(--s2)',
        s3: 'var(--s3)',
        tp: 'var(--tp)',
        ts: 'var(--ts)',
        tm: 'var(--tm)',
        accent: 'var(--accent)',
      },
      boxShadow: {
        accent: '0 0 8px var(--accent-glow2)',
      },
    },
  },
  plugins: [],
};
