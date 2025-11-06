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
  fontFamily: string;
  fontSize: {
    sm: string;
    md: string;
    lg: string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    bold: number;
  };
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
    primary: '#007bff',
    primaryHover: '#0056b3',
    primaryActive: '#004085',
    buttonBg: '#007bff',
    buttonText: '#ffffff',
    buttonBorder: '#007bff',
    breadcrumbText: '#6c757d',
    breadcrumbLink: '#007bff',
    breadcrumbSeparator: '#6c757d',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  radius: {
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.5rem',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
