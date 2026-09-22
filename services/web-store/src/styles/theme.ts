/**
 * KPA Society 테마 - Design System Alpha v1
 * 행정/공공기관 UI와 현대적 SaaS UI의 중간 톤
 */

export const colors = {
  // Primary colors (Design System Alpha v1)
  primary: '#2563EB',      // Blue 600
  primaryLight: '#3B82F6', // Blue 500
  primaryDark: '#1E3A8A',  // Blue 800

  // Neutrals (Tailwind Slate)
  neutral900: '#0F172A',
  neutral800: '#1E293B',
  neutral700: '#334155',
  neutral600: '#475569',
  neutral500: '#64748B',
  neutral400: '#94A3B8',
  neutral300: '#CBD5E1',
  neutral200: '#E2E8F0',
  neutral100: '#F1F5F9',
  neutral50: '#F8FAFC',

  // Legacy aliases (for backward compatibility)
  white: '#FFFFFF',
  black: '#0F172A',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',

  // Accent colors
  accentGreen: '#059669',
  accentRed: '#DC2626',
  accentYellow: '#D97706',

  // Status (legacy aliases)
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
};

export const fonts = {
  primary: "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  heading: "'Pretendard', 'Noto Sans KR', sans-serif",
};

export const typography = {
  headingXL: { fontSize: '1.875rem', fontWeight: 600 },  // text-3xl
  headingL: { fontSize: '1.5rem', fontWeight: 600 },     // text-2xl
  headingM: { fontSize: '1.25rem', fontWeight: 500 },    // text-xl
  headingS: { fontSize: '1.125rem', fontWeight: 500 },   // text-lg
  bodyL: { fontSize: '1rem', lineHeight: 1.625 },        // text-base
  bodyM: { fontSize: '0.875rem', lineHeight: 1.625 },    // text-sm
  bodyS: { fontSize: '0.75rem', lineHeight: 1.5 },       // text-xs
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  xxxl: '64px',
  sectionGap: '32px',  // gap-8
};

export const breakpoints = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1200px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
};

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  round: '50%',
};
