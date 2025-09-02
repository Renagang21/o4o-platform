/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Default gray colors for compatibility
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        // WordPress-style admin colors (updated to match CSS variables)
        admin: {
          blue: 'var(--wp-admin-blue)',
          'blue-dark': 'var(--wp-admin-blue-dark)',
          'blue-light': 'var(--wp-admin-blue-light)',
          red: 'var(--wp-admin-red)',
          green: 'var(--wp-admin-green)',
          orange: 'var(--wp-admin-orange)',
          purple: 'var(--wp-admin-purple)',
          gray: 'var(--wp-admin-gray)',
          'gray-light': 'var(--wp-admin-gray-light)',
          'gray-dark': 'var(--wp-admin-gray-dark)'
        },
        // WordPress sidebar colors
        sidebar: {
          bg: 'var(--wp-sidebar-bg)',
          hover: 'var(--wp-sidebar-hover)',
          active: 'var(--wp-sidebar-active)',
          text: 'var(--wp-sidebar-text)',
          border: 'var(--wp-sidebar-border)'
        },
        // WordPress background colors
        'wp-bg': {
          primary: 'var(--wp-bg-primary)',
          secondary: 'var(--wp-bg-secondary)',
          tertiary: 'var(--wp-bg-tertiary)'
        },
        // WordPress text colors
        'wp-text': {
          primary: 'var(--wp-text-primary)',
          secondary: 'var(--wp-text-secondary)',
          tertiary: 'var(--wp-text-tertiary)',
          white: 'var(--wp-text-white)'
        },
        // WordPress border colors
        'wp-border': {
          primary: 'var(--wp-border-primary)',
          secondary: 'var(--wp-border-secondary)',
          tertiary: 'var(--wp-border-tertiary)'
        },
        // Shadcn/ui colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      }
    },
  },
  plugins: [],
}