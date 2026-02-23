/**
 * Default theme tokens for hub-exploration-core.
 * Aligned with O4O platform Slate palette.
 */

export const DEFAULT_THEME = {
  primaryColor: '#2563EB',
  backgroundColor: '#ffffff',
  maxWidth: '1200px',
  sectionGap: '48px',
} as const;

export const NEUTRALS = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
} as const;

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
} as const;
