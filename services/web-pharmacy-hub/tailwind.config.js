/** @type {import('tailwindcss').Config} */
// WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
// Foundation 최소 설정. Design Core v1.0 토큰(--color-* / --space-*) 참조 방식은
// 기존 서비스와 동일하게 유지하고, 실제 화면 구축 WO 에서 확장한다.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
        },
      },
      spacing: {
        'dt-1': 'var(--space-1)',
        'dt-2': 'var(--space-2)',
        'dt-3': 'var(--space-3)',
        'dt-4': 'var(--space-4)',
        'dt-5': 'var(--space-5)',
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
