/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // WordPress-style admin colors
        admin: {
          blue: '#0073aa',
          'blue-dark': '#005177',
          'blue-light': '#00a0d2',
          gray: '#23282d',
          'gray-light': '#32373c',
          'gray-lighter': '#40464d',
          'gray-lightest': '#646970',
          green: '#00a32a',
          orange: '#f56e28',
          red: '#d63638',
          yellow: '#dba617'
        },
        // Modern admin theme
        sidebar: {
          bg: '#1e293b',
          hover: '#334155',
          active: '#0ea5e9',
          text: '#cbd5e1'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      }
    },
  },
  plugins: [],
}