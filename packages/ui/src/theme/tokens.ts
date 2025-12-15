/**
 * ═══════════════════════════════════════════════════════════════════════════
 * O4O Platform - Design Core Token v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @status OFFICIAL - Design Core Phase 1 공식 토큰
 * @version 1.0.0
 * @date 2025-12-15
 *
 * 이 파일은 O4O Platform의 **공식 디자인 토큰**입니다.
 * 모든 AG 컴포넌트와 View-Level UI가 이 토큰을 참조합니다.
 *
 * ⚠️ 수정 규칙:
 * - 신규 앱에서 임의 토큰 추가 ❌
 * - 앱별 커스텀 토큰 정의 ❌
 * - 기존 토큰 값 변경 시 Design Core 담당자 승인 필수
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const tokens = {
  // ═══════════════════════════════════════════════════════════════════════
  // Border Radius - 모서리 둥글기
  // ═══════════════════════════════════════════════════════════════════════
  radius: {
    none: 0,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    full: 9999,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Spacing Scale - 여백/간격 (px 단위)
  // ═══════════════════════════════════════════════════════════════════════
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Typography - 타이포그래피 스케일
  // ═══════════════════════════════════════════════════════════════════════
  typography: {
    h1: { fontSize: 28, fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: 24, fontWeight: 600, lineHeight: 1.3 },
    h3: { fontSize: 20, fontWeight: 600, lineHeight: 1.4 },
    h4: { fontSize: 18, fontWeight: 500, lineHeight: 1.4 },
    body: { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
    bodyLg: { fontSize: 16, fontWeight: 400, lineHeight: 1.5 },
    bodySm: { fontSize: 13, fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: 12, fontWeight: 400, lineHeight: 1.4 },
    label: { fontSize: 13, fontWeight: 500, lineHeight: 1.4 },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Colors - Semantic Color Palette
  // ═══════════════════════════════════════════════════════════════════════
  colors: {
    // Primary - 주요 액션/브랜드 컬러
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    // Success - 성공/완료 상태
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    // Warning - 경고/주의 상태
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    // Danger/Error - 에러/위험 상태
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    // Info - 정보/안내 상태
    info: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
    },
    // Neutral - 중립/기본 컬러
    neutral: {
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
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Shadows - 그림자 스케일
  // ═══════════════════════════════════════════════════════════════════════
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Z-Index - 레이어 순서
  // ═══════════════════════════════════════════════════════════════════════
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Transitions - 애니메이션 타이밍
  // ═══════════════════════════════════════════════════════════════════════
  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Breakpoints - 반응형 기준점 (px)
  // ═══════════════════════════════════════════════════════════════════════
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Type Exports - 타입 안전성을 위한 타입 정의
// ═══════════════════════════════════════════════════════════════════════════
export type TokenRadius = keyof typeof tokens.radius;
export type TokenSpacing = keyof typeof tokens.spacing;
export type TokenColor = keyof typeof tokens.colors;
export type TokenShadow = keyof typeof tokens.shadows;
export type TokenZIndex = keyof typeof tokens.zIndex;
export type TokenBreakpoint = keyof typeof tokens.breakpoints;
export type TokenTransition = keyof typeof tokens.transitions;

// ═══════════════════════════════════════════════════════════════════════════
// Design Core Token v1.0 - End of File
// ═══════════════════════════════════════════════════════════════════════════
