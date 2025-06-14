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
        primary: {
          DEFAULT: '#0052cc',
          light: '#e6f0ff',
          dark: '#0047b3'
        },
        secondary: {
          DEFAULT: '#e6f0ff',
          dark: '#d1e0ff'
        },
        success: {
          DEFAULT: '#1bc47d',
          light: '#e6f7f0',
          dark: '#16a067'
        },
        danger: {
          DEFAULT: '#e74c3c',
          light: '#fde8e7',
          dark: '#c53030'
        },
        text: {
          main: '#1f2937',
          secondary: '#4b5563',
          disabled: '#9ca3af'
        }
      },
      fontFamily: {
        sans: [
          'Pretendard',
          'Noto Sans',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ]
      },
      fontSize: {
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'xs': ['0.75rem', { lineHeight: '1rem' }]
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700'
      }
    }
  },
  plugins: [],
};

export default config; 