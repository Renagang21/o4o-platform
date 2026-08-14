/** @type {import('tailwindcss').Config} */
// WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
// Foundation 최소 설정. Design Core v1.0 토큰(--color-* / --space-*) 참조 방식은
// 기존 서비스와 동일하게 유지하고, 실제 화면 구축 WO 에서 확장한다.
export default {
  // WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1:
  //   공통 매장 셸(@o4o/store-ui-core)·공통 UI(@o4o/ui)는 source-mode 로 소비하므로
  //   해당 소스를 content 에 포함해야 클래스가 생성된다 (K-Cosmetics 와 동일 패턴).
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/store-ui-core/src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    // WO-O4O-STORE-HUB-SUPPLY-PRODUCT-EXPLORER-COMMONIZATION-V1:
    //   공통 공급 상품 탐색 View 가 DataTable/Pagination(@o4o/operator-ux-core)을 사용한다.
    // WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1:
    //   공통 운영자 셸(@o4o/operator-ux-core)도 source-mode 소비 — content 누락 시
    //   OperatorAreaShell/DomainIASidebar 의 lg: 반응형 클래스가 생성되지 않아
    //   사이드바가 좌측 컬럼으로 서지 않는다 (K-Cosmetics 와 동일 항목).
    '../../packages/operator-ux-core/src/**/*.{ts,tsx}',
    // WO-O4O-PHARMACY-HUB-OPERATOR-MEMBERSHIP-CONSOLE-COMMON-CORE-ADOPTION-V1
    '../../packages/operator-core-ui/src/**/*.{ts,tsx}',
    '../../packages/shared-space-ui/src/**/*.{ts,tsx}',
    // WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-FULL-CLOSE-V1:
    //   공통 계정 UI(@o4o/account-ui) 소비분의 클래스 누락 방지 (다른 4개 서비스와 동일 항목).
    '../../packages/account-ui/src/**/*.{ts,tsx}',
    // WO-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1:
    //   태블릿 Screen Set 편집기·kiosk 미리보기를 공유 패키지에서 그대로 쓴다.
    '../../packages/tablet-screen-set-editor/src/**/*.{ts,tsx}',
    '../../packages/tablet-kiosk-core/src/**/*.{ts,tsx}',
    '../../packages/content-editor/src/**/*.{ts,tsx}',
  ],
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
