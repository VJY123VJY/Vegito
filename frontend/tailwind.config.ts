import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#1a6b3a',   // Primary deep green
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        lime: {
          400: '#a3e635',
          500: '#84cc16',
          600: '#65a30d',
        },
        vegito: {
          green:   '#1a6b3a',
          lime:    '#6fcf3a',
          light:   '#f0fdf4',
          surface: '#fafafa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)',
        'bottom-bar': '0 -2px 8px 0 rgb(0 0 0 / 0.06)',
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
};

export default config;
