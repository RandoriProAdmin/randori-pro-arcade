import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'rp-dunkelrot': '#6d1723',
        'rp-rot': '#dc0d1d',
        'rp-rot-mittel': '#aa1a1d',
        'rp-beige': '#d4c9b5',
        'rp-grau': '#575e62',
        'rp-hellgrau': '#f3f3f3',
        'rp-weiss': '#ffffff',
        'rp-schwarz': '#1a1a1a',
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        rp: '0.05em',
      },
      borderRadius: {
        rp: '4px',
      },
      transitionDuration: {
        rp: '200ms',
      },
    },
  },
  plugins: [],
};

export default config;
