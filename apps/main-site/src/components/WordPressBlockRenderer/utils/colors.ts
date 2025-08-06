/**
 * Color utility functions for WordPress blocks
 */

// WordPress default color palette
const DEFAULT_COLORS = {
  'pale-pink': '#f78da7',
  'vivid-red': '#cf2e2e',
  'luminous-vivid-orange': '#ff6900',
  'luminous-vivid-amber': '#fcb900',
  'light-green-cyan': '#7bdcb5',
  'vivid-green-cyan': '#00d084',
  'pale-cyan-blue': '#8ed1fc',
  'vivid-cyan-blue': '#0693e3',
  'cyan-bluish-gray': '#abb8c3',
  'very-light-gray': '#f0f0f1',
  'very-dark-gray': '#313131',
};

/**
 * Get color class name
 */
export function getColorClassName(type: 'color' | 'background-color', color?: string): string {
  if (!color) return '';
  return `has-${color}-${type}`;
}

/**
 * Get color style object
 */
export function getColorStyle(property: 'color' | 'backgroundColor', value?: string): React.CSSProperties {
  if (!value) return {};
  
  // Check if it's a named color
  const defaultColor = DEFAULT_COLORS[value as keyof typeof DEFAULT_COLORS];
  if (defaultColor) {
    return { [property]: defaultColor };
  }
  
  // Otherwise use the value as is (custom color)
  return { [property]: value };
}

/**
 * Get gradient class name
 */
export function getGradientClassName(gradient?: string): string {
  if (!gradient) return '';
  return `has-${gradient}-gradient-background`;
}