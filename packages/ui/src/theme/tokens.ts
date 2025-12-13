/**
 * O4O Design System - Theme Tokens
 *
 * Phase 7-A: 핵심 디자인 토큰 정의
 * 모든 AG 컴포넌트가 참조하는 기본 값
 */

export const tokens = {
  // Border radius
  radius: {
    none: 0,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    full: 9999,
  },

  // Spacing scale
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
  },

  // Typography
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

  // Colors (semantic)
  colors: {
    // Primary
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
    // Success
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    // Warning
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    // Danger/Error
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    // Neutral
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

  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Transitions
  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },

  // Breakpoints
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
} as const;

// Type exports
export type TokenRadius = keyof typeof tokens.radius;
export type TokenSpacing = keyof typeof tokens.spacing;
export type TokenColor = keyof typeof tokens.colors;
export type TokenShadow = keyof typeof tokens.shadows;
export type TokenBreakpoint = keyof typeof tokens.breakpoints;
