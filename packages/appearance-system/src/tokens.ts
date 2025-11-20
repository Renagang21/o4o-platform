/**
 * Design Tokens - Single Source of Truth (SSOT)
 *
 * This file contains all appearance-related design tokens for the O4O platform.
 * These tokens replace legacy CSS variables (--wp-*, --ast-*) with standardized --o4o-* naming.
 *
 * Usage:
 * - Import tokens from '@o4o/appearance-system'
 * - DO NOT hardcode color/spacing values in components
 * - DO NOT use legacy --wp-* or --ast-* variables directly
 *
 * @see /docs/APPEARANCE_TOKENS.md for complete token documentation
 */

// TODO: Phase 2 - Migrate tokens from apps/admin/src/lib/appearance/tokens.ts
// TODO: Phase 2 - Merge with apps/main-site/src/lib/theme/tokens.ts
// TODO: Phase 2 - Consolidate with apps/api-server widget appearance settings

/**
 * Color tokens
 * Will replace: --wp-button-bg, --ast-button-bg, etc.
 */
export interface ColorTokens {
  // Primary palette
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primarySoft: string;  // Soft/subtle primary color for backgrounds

  // Site-wide colors
  background: string;      // Site-wide background color
  surface: string;         // Card/box/section background color
  surfaceMuted: string;    // Muted/subtle surface for sub-sections
  borderSubtle: string;    // Subtle border color
  textPrimary: string;     // Primary text color
  textMuted: string;       // Muted/secondary text color

  // Button colors
  buttonBg: string;
  buttonText: string;
  buttonBorder: string;

  // Breadcrumb colors
  breadcrumbText: string;
  breadcrumbLink: string;
  breadcrumbSeparator: string;

  // TODO: Add remaining color tokens
}

/**
 * Spacing tokens
 * Will replace: --wp-spacing-*, --ast-spacing-*
 */
export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;

  // Layout spacing
  sectionY: number;   // Section vertical padding (px)
  blockGap: number;   // Gap between blocks (px)
  gridGap: number;    // Gap between grid items (px)

  // TODO: Add remaining spacing tokens
}

/**
 * Border radius tokens
 * Will replace: --wp-radius, --ast-radius
 */
export interface RadiusTokens {
  sm: string;
  md: string;
  lg: string;
  // TODO: Add remaining radius tokens
}

/**
 * Typography tokens
 * Will replace: --wp-font-*, --ast-font-*
 */
export interface TypographyTokens {
  // Font families
  fontFamilyHeading: string;  // Font for headings
  fontFamilyBody: string;     // Font for body text
  fontFamily: string;         // Legacy/fallback font family

  // Base typography settings
  fontSizeBase: string;       // Base font size (e.g., "16px")
  lineHeightBase: number;     // Base line height (e.g., 1.6)

  // Font sizes
  fontSize: {
    sm: string;
    md: string;
    lg: string;
  };

  // Font weights
  fontWeight: {
    normal: number;
    medium: number;
    bold: number;
  };

  // Line heights
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };

  // TODO: Add remaining typography tokens
}

/**
 * Complete design token interface
 */
export interface DesignTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  typography: TypographyTokens;
}

/**
 * Default token values (minimal sample for Phase 1)
 * These will be expanded in Phase 2-3 with actual values from existing systems
 */
export const defaultTokens: DesignTokens = {
  colors: {
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    primaryActive: '#1E3A8A',
    primarySoft: '#EFF6FF',

    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceMuted: '#F3F4F6',
    borderSubtle: '#E5E7EB',
    textPrimary: '#111827',
    textMuted: '#6B7280',

    buttonBg: '#2563EB',
    buttonText: '#ffffff',
    buttonBorder: '#2563EB',
    breadcrumbText: '#6c757d',
    breadcrumbLink: '#2563EB',
    breadcrumbSeparator: '#6c757d',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    sectionY: 80,
    blockGap: 24,
    gridGap: 24,
  },
  radius: {
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.5rem',
  },
  typography: {
    fontFamilyHeading: 'Inter, Pretendard, sans-serif',
    fontFamilyBody: 'Inter, Pretendard, sans-serif',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSizeBase: '16px',
    lineHeightBase: 1.6,
    fontSize: {
      sm: '0.875rem',
      md: '1rem',
      lg: '1.25rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
};

/**
 * Generate CSS custom properties from design tokens
 * @param tokens - Design tokens object
 * @returns CSS variables string
 */
export function generateCSSVariables(tokens: DesignTokens): string {
  // TODO: Phase 2 - Implement CSS variable generation
  // This will replace generateButtonCSS, generateBreadcrumbCSS, etc.
  return `
    /* O4O Design Tokens */
    /* TODO: Generate from tokens object */
  `.trim();
}
