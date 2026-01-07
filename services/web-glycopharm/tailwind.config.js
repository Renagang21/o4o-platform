/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ========================================
        // Design Token 연동 - 의미 기반 색상
        // CSS 변수를 참조하여 일관성 유지
        // ========================================

        // Primary 색상 (서비스별 테마 - CSS 변수로 관리)
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
          darker: 'var(--color-primary-darker)',
        },

        // 텍스트 색상 (의미 기반)
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
          inverse: 'var(--color-text-inverse)',
        },

        // 배경 색상 (의미 기반)
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
          hover: 'var(--color-bg-hover)',
          active: 'var(--color-bg-active)',
        },

        // 테두리 색상 (의미 기반)
        border: {
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
        },

        // 아이콘 색상 (의미 기반)
        icon: {
          DEFAULT: 'var(--color-icon-default)',
          secondary: 'var(--color-icon-secondary)',
          hover: 'var(--color-icon-hover)',
          active: 'var(--color-icon-active)',
          success: 'var(--color-icon-success)',
          warning: 'var(--color-icon-warning)',
          error: 'var(--color-icon-error)',
        },

        // 버튼 색상 (의미 기반)
        btn: {
          'primary-bg': 'var(--color-btn-primary-bg)',
          'primary-text': 'var(--color-btn-primary-text)',
          'primary-hover': 'var(--color-btn-primary-hover)',
          'secondary-bg': 'var(--color-btn-secondary-bg)',
          'secondary-text': 'var(--color-btn-secondary-text)',
          'secondary-border': 'var(--color-btn-secondary-border)',
          'secondary-hover': 'var(--color-btn-secondary-hover)',
          'ghost-bg': 'var(--color-btn-ghost-bg)',
          'ghost-text': 'var(--color-btn-ghost-text)',
          'ghost-hover': 'var(--color-btn-ghost-hover)',
        },

        // 카드 색상 (의미 기반)
        card: {
          bg: 'var(--color-card-bg)',
          border: 'var(--color-card-border)',
          'hover-border': 'var(--color-card-hover-border)',
        },

        // 상태 색상 (시맨틱)
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',

        // Accent: 혈당 레드 (GAMDANG 로고 기반) - 레거시 유지
        accent: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#E74C3C',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },

      // 스페이싱 (Design Token 연동)
      spacing: {
        'dt-1': 'var(--space-1)',
        'dt-2': 'var(--space-2)',
        'dt-3': 'var(--space-3)',
        'dt-4': 'var(--space-4)',
        'dt-5': 'var(--space-5)',
        'dt-6': 'var(--space-6)',
        'dt-7': 'var(--space-7)',
      },

      // 보더 라디우스 (Design Token 연동)
      borderRadius: {
        'dt-sm': 'var(--radius-sm)',
        'dt-md': 'var(--radius-md)',
        'dt-lg': 'var(--radius-lg)',
        'dt-xl': 'var(--radius-xl)',
        'dt-full': 'var(--radius-full)',
      },

      // 박스 섀도우 (Design Token 연동)
      boxShadow: {
        'dt-sm': 'var(--shadow-sm)',
        'dt-md': 'var(--shadow-md)',
        'dt-lg': 'var(--shadow-lg)',
      },

      // 트랜지션 (Design Token 연동)
      transitionDuration: {
        'dt-fast': '150ms',
        'dt-normal': '200ms',
        'dt-slow': '300ms',
      },

      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
