/**
 * Design System - Design Tokens
 *
 * Central export for all design tokens
 */

export * from './colors';
export * from './spacing';
export * from './radius';
export * from './shadows';
export * from './typography';

// Re-export as a single tokens object for convenience
import { colors } from './colors';
import { spacing, spacingScale } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { typography, fontFamily, fontWeight, lineHeight } from './typography';

export const tokens = {
  colors,
  spacing,
  spacingScale,
  radius,
  shadows,
  typography,
  fontFamily,
  fontWeight,
  lineHeight,
} as const;
