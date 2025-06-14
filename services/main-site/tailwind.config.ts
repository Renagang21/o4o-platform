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
        // o4o Primary Colors (브랜드 아이덴티티)
        'o4o-primary': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',   // 메인 블루
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        
        // o4o Trust Colors (신뢰성 강조)
        'o4o-trust': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',     // 신뢰 그린
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },

        // Semantic Colors (의미 기반 컬러)
        'trust-verified': '#10b981',     // 검증됨
        'trust-pending': '#f59e0b',      // 검증 중
        'trust-unverified': '#6b7280',   // 미검증
        'trust-warning': '#ef4444',      // 주의

        // 사용자 역할별
        'role-supplier': '#8b5cf6',      // 공급자
        'role-reseller': '#06b6d4',      // 판매자
        'role-customer': '#84cc16',      // 구매자
        'role-expert': '#f59e0b',        // 전문가
        'role-partner': '#ec4899',       // 파트너

        // 정보 타입별
        'info-technical': '#3b82f6',     // 기술 정보
        'info-safety': '#10b981',        // 안전성 정보
        'info-usage': '#8b5cf6',         // 사용법 정보
        'info-review': '#f59e0b',        // 사용자 리뷰

        // 모듈별 컬러
        // 드랍쉬핑 (건강기능식품/의료기기)
        'dropship-health': {
          primary: '#2563EB',
          secondary: '#1E40AF',
          accent: '#10B981',
          background: '#F8FAFC'
        },
        
        // 크라우드펀딩
        'crowdfunding': {
          primary: '#FF6B35',
          secondary: '#004E89',
          accent: '#00A8CC',
          success: '#10B981',
          warning: '#F59E0B',
          neutral: '#6B7280'
        },

        // 디지털 사이니지
        'signage': {
          primary: '#1E293B',
          secondary: '#475569',
          accent: '#3B82F6',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444'
        },

        // 기존 색상들 유지
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
        // o4o 폰트 스택
        'o4o-primary': [
          'Pretendard Variable',
          'Pretendard', 
          '-apple-system', 
          'BlinkMacSystemFont', 
          'system-ui', 
          'sans-serif'
        ],
        'o4o-mono': [
          'JetBrains Mono', 
          'Fira Code', 
          'Consolas', 
          'monospace'
        ],
        'o4o-serif': [
          'Noto Serif KR', 
          'serif'
        ],
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
        // o4o 타이포그래피 스케일
        // Display - 대형 헤드라인
        'display-2xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],  // 72px
        'display-xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],  // 60px
        'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],     // 48px
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],  // 36px
        'display-sm': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }], // 30px

        // Heading - 섹션 제목
        'heading-xl': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],   // 24px
        'heading-lg': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.01em' }],  // 20px
        'heading-md': ['1.125rem', { lineHeight: '1.4', letterSpacing: '-0.01em' }], // 18px
        'heading-sm': ['1rem', { lineHeight: '1.5' }],                               // 16px

        // Body - 본문 텍스트
        'body-xl': ['1.125rem', { lineHeight: '1.6' }],  // 18px
        'body-lg': ['1rem', { lineHeight: '1.6' }],      // 16px
        'body-md': ['0.875rem', { lineHeight: '1.5' }],  // 14px
        'body-sm': ['0.75rem', { lineHeight: '1.4' }],   // 12px

        // Label - 라벨/캡션
        'label-lg': ['0.875rem', { lineHeight: '1.4' }], // 14px
        'label-md': ['0.75rem', { lineHeight: '1.3' }],  // 12px
        'label-sm': ['0.6875rem', { lineHeight: '1.3' }], // 11px

        // 기존 크기들 유지
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'xs': ['0.75rem', { lineHeight: '1rem' }]
      },
      spacing: {
        // o4o 간격 시스템
        '0.5': '0.125rem',   // 2px
        '1.5': '0.375rem',   // 6px
        '2.5': '0.625rem',   // 10px
        '3.5': '0.875rem',   // 14px
        // 기존 spacing 유지하면서 추가
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800'
      },
      animation: {
        // o4o 애니메이션
        'trust-build': 'trust-build 2s ease-out',
        'verify-pulse': 'verify-pulse 1.5s ease-in-out',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
      },
      keyframes: {
        'trust-build': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '50%': {
            opacity: '0.7',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'verify-pulse': {
          '0%, 100%': {
            transform: 'scale(1)',
            'box-shadow': '0 0 0 0 rgba(34, 197, 94, 0.4)',
          },
          '50%': {
            transform: 'scale(1.05)',
            'box-shadow': '0 0 0 10px rgba(34, 197, 94, 0)',
          },
        },
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    }
  },
  plugins: [],
};

export default config;