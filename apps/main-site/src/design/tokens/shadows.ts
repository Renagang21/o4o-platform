/**
 * Design System - Shadow Tokens
 *
 * Consistent elevation/shadow scale
 */

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 2px 4px rgba(0, 0, 0, 0.08)',
  lg: '0 4px 12px rgba(0, 0, 0, 0.12)',
  xl: '0 8px 24px rgba(0, 0, 0, 0.15)',
  '2xl': '0 16px 48px rgba(0, 0, 0, 0.18)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
} as const;

export type ShadowToken = keyof typeof shadows;
