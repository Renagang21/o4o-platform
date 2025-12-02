/**
 * Design System - Typography Tokens
 *
 * Consistent typography scale and styles
 */

export const typography = {
  // Display styles
  display1: 'text-5xl font-bold',
  display2: 'text-4xl font-bold',

  // Heading styles
  h1: 'text-3xl font-bold',
  h2: 'text-2xl font-semibold',
  h3: 'text-xl font-semibold',
  h4: 'text-lg font-semibold',
  h5: 'text-base font-semibold',
  h6: 'text-sm font-semibold',

  // Body styles
  body: 'text-base text-neutral-700',
  bodyLarge: 'text-lg text-neutral-700',
  bodySmall: 'text-sm text-neutral-700',

  // Label styles
  label: 'text-sm font-medium text-neutral-900',
  labelSmall: 'text-xs font-medium text-neutral-900',

  // Caption styles
  caption: 'text-sm text-neutral-500',
  small: 'text-xs text-neutral-500',

  // Special styles
  mono: 'font-mono text-sm',
  link: 'text-primary hover:text-primaryDark underline',
} as const;

export type TypographyToken = keyof typeof typography;

/**
 * Font family tokens
 */
export const fontFamily = {
  sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  mono: '"Fira Code", "Courier New", monospace',
} as const;

/**
 * Font weight tokens
 */
export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Line height tokens
 */
export const lineHeight = {
  tight: '1.25',
  normal: '1.5',
  relaxed: '1.75',
} as const;
