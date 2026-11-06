/** @type {import('tailwindcss').Config} */
// WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
// 서비스 회원 심사는 공통 DataTable·ActionBar를 소비하므로 해당 패키지의 클래스도 포함한다.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../packages/operator-ux-core/src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
