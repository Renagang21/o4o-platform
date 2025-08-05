/**
 * Typography utility functions for WordPress blocks
 */

// WordPress default font sizes
const FONT_SIZES = {
  small: 'has-small-font-size',
  normal: 'has-normal-font-size',
  medium: 'has-medium-font-size',
  large: 'has-large-font-size',
  'x-large': 'has-x-large-font-size',
  huge: 'has-huge-font-size',
};

/**
 * Get font size class
 */
export function getFontSizeClass(fontSize?: string): string {
  if (!fontSize) return '';
  return FONT_SIZES[fontSize as keyof typeof FONT_SIZES] || '';
}

/**
 * Get text alignment class
 */
export function getAlignmentClass(align?: string): string {
  if (!align) return '';
  return `has-text-align-${align}`;
}