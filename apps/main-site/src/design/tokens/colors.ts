/**
 * Design System - Color Tokens
 *
 * Unified color palette for O4O Platform
 */

export const colors = {
  // Primary brand colors
  primary: '#1A73E8',
  primaryDark: '#0F4EB3',
  primaryLight: '#4A8FEC',

  // Secondary colors
  secondary: '#F97316',
  secondaryDark: '#EA580C',
  secondaryLight: '#FB923C',

  // Neutral colors
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

  // Semantic colors
  danger: '#DC2626',
  dangerDark: '#B91C1C',
  dangerLight: '#EF4444',

  success: '#16A34A',
  successDark: '#15803D',
  successLight: '#22C55E',

  warning: '#F59E0B',
  warningDark: '#D97706',
  warningLight: '#FBBF24',

  info: '#3B82F6',
  infoDark: '#2563EB',
  infoLight: '#60A5FA',

  // Background colors
  background: '#FFFFFF',
  backgroundAlt: '#F8FAFC',
  backgroundDark: '#0F172A',

  // Border colors
  border: '#E2E8F0',
  borderDark: '#CBD5E1',

  // Text colors
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;
