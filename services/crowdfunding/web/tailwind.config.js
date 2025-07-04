/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crowdfunding: {
          primary: '#FF6B35',
          secondary: '#004E89',
          accent: '#00A8CC',
          success: '#10B981',
          warning: '#F59E0B',
          neutral: '#6B7280',
        },
        funding: {
          preparing: '#8B5CF6',
          active: '#10B981',
          success: '#059669',
          failed: '#DC2626',
          delivered: '#374151',
        },
      },
    },
  },
  plugins: [],
}