import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand
        'rp-dunkelrot': '#6d1723',
        'rp-rot': '#dc0d1d',
        'rp-rot-mittel': '#aa1a1d',
        'rp-beige': '#d4c9b5',
        'rp-grau': '#575e62',
        'rp-hellgrau': '#f3f3f3',
        'rp-weiss': '#ffffff',
        'rp-schwarz': '#1a1a1a',
        // Extended UI palette
        'rp-bg': '#0f0f0f',
        'rp-bg-secondary': '#1a1a1a',
        'rp-bg-card': '#1e1e1e',
        'rp-bg-elevated': '#252525',
        'rp-text': '#ffffff',
        'rp-text-secondary': '#a0a0a0',
        'rp-text-muted': '#666666',
      },
      fontFamily: {
        sans: ['"DM Sans"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Bebas Neue"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        rp: '0.05em',
        'rp-tight': '0.06em',
        'rp-wide': '0.08em',
        'rp-display': '0.12em',
        'rp-logo': '0.15em',
      },
      borderRadius: {
        rp: '4px',
        'rp-sm': '8px',
        'rp-md': '12px',
        'rp-lg': '16px',
      },
      transitionDuration: {
        rp: '200ms',
        'rp-slow': '400ms',
      },
    },
  },
  plugins: [],
};

export default config;
