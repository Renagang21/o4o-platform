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
  return `
:root {
  /* Color Tokens */
  --o4o-color-primary: ${tokens.colors.primary};
  --o4o-color-primary-hover: ${tokens.colors.primaryHover};
  --o4o-color-primary-active: ${tokens.colors.primaryActive};
  --o4o-color-primary-soft: ${tokens.colors.primarySoft};

  --o4o-color-background: ${tokens.colors.background};
  --o4o-color-surface: ${tokens.colors.surface};
  --o4o-color-surface-muted: ${tokens.colors.surfaceMuted};
  --o4o-color-border-subtle: ${tokens.colors.borderSubtle};
  --o4o-color-text-primary: ${tokens.colors.textPrimary};
  --o4o-color-text-muted: ${tokens.colors.textMuted};

  --o4o-color-button-bg: ${tokens.colors.buttonBg};
  --o4o-color-button-text: ${tokens.colors.buttonText};
  --o4o-color-button-border: ${tokens.colors.buttonBorder};

  --o4o-color-breadcrumb-text: ${tokens.colors.breadcrumbText};
  --o4o-color-breadcrumb-link: ${tokens.colors.breadcrumbLink};
  --o4o-color-breadcrumb-separator: ${tokens.colors.breadcrumbSeparator};

  /* Spacing Tokens */
  --o4o-spacing-xs: ${tokens.spacing.xs};
  --o4o-spacing-sm: ${tokens.spacing.sm};
  --o4o-spacing-md: ${tokens.spacing.md};
  --o4o-spacing-lg: ${tokens.spacing.lg};
  --o4o-spacing-xl: ${tokens.spacing.xl};
  --o4o-spacing-section-y: ${tokens.spacing.sectionY}px;
  --o4o-spacing-block-gap: ${tokens.spacing.blockGap}px;
  --o4o-spacing-grid-gap: ${tokens.spacing.gridGap}px;

  /* Border Radius Tokens */
  --o4o-radius-sm: ${tokens.radius.sm};
  --o4o-radius-md: ${tokens.radius.md};
  --o4o-radius-lg: ${tokens.radius.lg};

  /* Typography Tokens */
  --o4o-font-family-heading: ${tokens.typography.fontFamilyHeading};
  --o4o-font-family-body: ${tokens.typography.fontFamilyBody};
  --o4o-font-family: ${tokens.typography.fontFamily};
  --o4o-font-size-base: ${tokens.typography.fontSizeBase};
  --o4o-line-height-base: ${tokens.typography.lineHeightBase};

  --o4o-font-size-sm: ${tokens.typography.fontSize.sm};
  --o4o-font-size-md: ${tokens.typography.fontSize.md};
  --o4o-font-size-lg: ${tokens.typography.fontSize.lg};

  --o4o-font-weight-normal: ${tokens.typography.fontWeight.normal};
  --o4o-font-weight-medium: ${tokens.typography.fontWeight.medium};
  --o4o-font-weight-bold: ${tokens.typography.fontWeight.bold};

  --o4o-line-height-tight: ${tokens.typography.lineHeight.tight};
  --o4o-line-height-normal: ${tokens.typography.lineHeight.normal};
  --o4o-line-height-relaxed: ${tokens.typography.lineHeight.relaxed};
}

/* Apply design tokens to body */
body {
  font-family: var(--o4o-font-family-body);
  font-size: var(--o4o-font-size-base);
  line-height: var(--o4o-line-height-base);
  color: var(--o4o-color-text-primary);
  background-color: var(--o4o-color-background);
}

/* Heading styles */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--o4o-font-family-heading);
  font-weight: var(--o4o-font-weight-bold);
  color: var(--o4o-color-text-primary);
}
  `.trim();
}
