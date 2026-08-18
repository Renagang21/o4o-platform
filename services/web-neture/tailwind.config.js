/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/operator-core/src/**/*.{ts,tsx}",
    "../../packages/operator-ux-core/src/**/*.{ts,tsx}",
    "../../packages/operator-core-ui/src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/account-ui/src/**/*.{ts,tsx}",
    // WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1:
    //   Neture 는 이미 shared-space-ui 컴포넌트(ForumHubTemplate · ForumListTemplate ·
    //   ForumRequestForm · ResourcesHubTemplate · StandardHomeTemplate 등)를 쓰는데 content 에
    //   경로가 없어 그 안의 Tailwind 클래스가 purge 되고 있었다. 소유자 영역 공통화로
    //   ForumOwnerDashboard 가 추가되면서 필수가 되어 함께 채운다 (기존 누락도 같이 해소).
    "../../packages/shared-space-ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
}
