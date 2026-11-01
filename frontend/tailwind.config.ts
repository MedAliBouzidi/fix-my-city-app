import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        status: {
          received: {
            bg: '#f1f5f9',
            text: '#334155',
            border: '#cbd5e1',
          },
          pending_validation: {
            bg: '#fef3c7',
            text: '#92400e',
            border: '#fde68a',
          },
          validated: {
            bg: '#ecfdf5',
            text: '#065f46',
            border: '#a7f3d0',
          },
          rejected: {
            bg: '#fef2f2',
            text: '#991b1b',
            border: '#fecaca',
          },
          assigned: {
            bg: '#f5f3ff',
            text: '#5b21b6',
            border: '#ddd6fe',
          },
          in_progress: {
            bg: '#eff6ff',
            text: '#1e40af',
            border: '#bfdbfe',
          },
          resolved: {
            bg: '#f0fdf4',
            text: '#166534',
            border: '#bbf7d0',
          },
        },
        priority: {
          low: {
            bg: '#f8fafc',
            text: '#475569',
            border: '#e2e8f0',
          },
          medium: {
            bg: '#f0f9ff',
            text: '#0369a1',
            border: '#bae6fd',
          },
          high: {
            bg: '#fff7ed',
            text: '#c2410c',
            border: '#fed7aa',
          },
          critical: {
            bg: '#fff1f2',
            text: '#be123c',
            border: '#fecdd3',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
