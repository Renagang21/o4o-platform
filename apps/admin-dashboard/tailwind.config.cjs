/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx}"
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

        // ========================================
        // Unified Token System - --wp-* variables
        // ========================================

        // Primary/Secondary brand colors
        'wp-primary': {
          50: 'var(--wp-color-primary-50)',
          100: 'var(--wp-color-primary-100)',
          200: 'var(--wp-color-primary-200)',
          300: 'var(--wp-color-primary-300)',
          400: 'var(--wp-color-primary-400)',
          DEFAULT: 'var(--wp-color-primary-500)',
          500: 'var(--wp-color-primary-500)',
          600: 'var(--wp-color-primary-600)',
          700: 'var(--wp-color-primary-700)',
          800: 'var(--wp-color-primary-800)',
          900: 'var(--wp-color-primary-900)',
        },
        'wp-secondary': {
          50: 'var(--wp-color-secondary-50)',
          100: 'var(--wp-color-secondary-100)',
          200: 'var(--wp-color-secondary-200)',
          300: 'var(--wp-color-secondary-300)',
          400: 'var(--wp-color-secondary-400)',
          DEFAULT: 'var(--wp-color-secondary-500)',
          500: 'var(--wp-color-secondary-500)',
          600: 'var(--wp-color-secondary-600)',
          700: 'var(--wp-color-secondary-700)',
          800: 'var(--wp-color-secondary-800)',
          900: 'var(--wp-color-secondary-900)',
        },

        // O4O brand colors
        'o4o-blue': '#2271b1',
        'o4o-blue-hover': '#135e96',

        // Admin UI colors
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

        // Sidebar colors
        sidebar: {
          bg: 'var(--wp-sidebar-bg)',
          hover: 'var(--wp-sidebar-hover)',
          active: 'var(--wp-sidebar-active)',
          'active-text': 'var(--wp-sidebar-active-text)',
          text: 'var(--wp-sidebar-text)',
          border: 'var(--wp-sidebar-border)'
        },

        // Background colors
        'wp-bg': {
          body: 'var(--wp-bg-body)',
          content: 'var(--wp-bg-content)',
          primary: 'var(--wp-bg-primary)',
          secondary: 'var(--wp-bg-secondary)',
          tertiary: 'var(--wp-bg-tertiary)',
          inverse: 'var(--wp-bg-inverse)',
        },

        // Text colors
        'wp-text': {
          primary: 'var(--wp-text-primary)',
          secondary: 'var(--wp-text-secondary)',
          tertiary: 'var(--wp-text-tertiary)',
          inverse: 'var(--wp-text-inverse)',
        },

        // Border colors
        'wp-border': {
          primary: 'var(--wp-border-primary)',
          secondary: 'var(--wp-border-secondary)',
          focus: 'var(--wp-border-focus)',
        },

        // Button colors
        'wp-btn': {
          'primary-bg': 'var(--wp-btn-primary-bg)',
          'primary-hover': 'var(--wp-btn-primary-bg-hover)',
          'primary-text': 'var(--wp-btn-primary-text)',
          'secondary-bg': 'var(--wp-btn-secondary-bg)',
          'secondary-hover': 'var(--wp-btn-secondary-bg-hover)',
          'secondary-text': 'var(--wp-btn-secondary-text)',
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
        "slide-in-right": {
          from: {
            transform: "translateX(100%)",
            opacity: "0"
          },
          to: {
            transform: "translateX(0)",
            opacity: "1"
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
      }
    },
  },
  plugins: [],
}