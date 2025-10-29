/**
 * Typography Utilities
 * Helper functions for handling font sizes and text styles
 */

/**
 * WordPress font size slugs to CSS classes
 */
const fontSizeMap: Record<string, string> = {
  'small': 'has-small-font-size',
  'medium': 'has-medium-font-size',
  'large': 'has-large-font-size',
  'x-large': 'has-x-large-font-size',
};

/**
 * Get font size class name
 */
export function getFontSizeClass(fontSize?: string): string | undefined {
  if (!fontSize) return undefined;

  return fontSizeMap[fontSize] || `has-${fontSize}-font-size`;
}

/**
 * Get custom font size style
 */
export function getFontSizeStyle(customFontSize?: number | string): React.CSSProperties {
  if (!customFontSize) return {};

  const fontSize = typeof customFontSize === 'number'
    ? `${customFontSize}px`
    : customFontSize;

  return {
    fontSize,
  };
}

/**
 * Get text alignment class
 */
export function getAlignmentClass(align?: string): string | undefined {
  if (!align || align === 'left') return undefined;

  return `has-text-align-${align}`;
}
