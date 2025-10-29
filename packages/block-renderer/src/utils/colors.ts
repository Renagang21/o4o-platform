/**
 * Color Utilities
 * Helper functions for handling WordPress color classes and custom colors
 */

/**
 * Get WordPress color class name
 */
export function getColorClassName(type: 'color' | 'background-color', colorSlug?: string): string | undefined {
  if (!colorSlug) return undefined;

  const prefix = type === 'color' ? 'has-text' : 'has-background';
  return `${prefix}-${colorSlug}`;
}

/**
 * Get custom color style
 */
export function getColorStyle(property: 'color' | 'backgroundColor', customColor?: string): React.CSSProperties {
  if (!customColor) return {};

  return {
    [property]: customColor,
  };
}

/**
 * Parse color value (hex, rgb, rgba, etc.)
 */
export function parseColor(color?: string): string | undefined {
  if (!color) return undefined;

  // Already a valid CSS color
  if (color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl')) {
    return color;
  }

  // Named color
  return color;
}
