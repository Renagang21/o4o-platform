/**
 * Tailwind CSS Class Parser
 * Parses Tailwind utility classes and converts to O4O block attributes
 */

/**
 * Parse font size from Tailwind class
 * @example parseFontSize('text-lg') => 18
 */
export function parseFontSize(className?: string): number {
  if (!className) return 16;

  const sizeMap: Record<string, number> = {
    'xs': 12,
    'sm': 14,
    'base': 16,
    'lg': 18,
    'xl': 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  };

  const match = className.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)/);
  return sizeMap[match?.[1] || 'base'] || 16;
}

/**
 * Parse text color from Tailwind class
 * @example parseTextColor('text-blue-600') => '#2563eb'
 */
export function parseTextColor(className?: string): string {
  if (!className) return '#000000';

  // Simplified color mapping (expand as needed)
  const colorMap: Record<string, string> = {
    'gray-50': '#f9fafb',
    'gray-100': '#f3f4f6',
    'gray-500': '#6b7280',
    'gray-900': '#111827',
    'blue-600': '#2563eb',
    'blue-700': '#1d4ed8',
    'red-500': '#ef4444',
    'green-500': '#22c55e',
  };

  const match = className.match(/text-(\w+-\d+)/);
  if (match) {
    return colorMap[match[1]] || '#000000';
  }

  return '#000000';
}

/**
 * Parse background color from Tailwind class
 * @example parseBackgroundColor('bg-blue-600') => '#2563eb'
 */
export function parseBackgroundColor(className?: string): string {
  if (!className) return '';

  const colorMap: Record<string, string> = {
    'white': '#ffffff',
    'gray-50': '#f9fafb',
    'gray-100': '#f3f4f6',
    'gray-200': '#e5e7eb',
    'blue-600': '#2563eb',
    'blue-500': '#3b82f6',
  };

  const match = className.match(/bg-(\w+-?\d*)/);
  if (match) {
    return colorMap[match[1]] || '';
  }

  return '';
}

/**
 * Parse grid columns from Tailwind class
 * @example parseGridColumns('grid-cols-3') => 3
 */
export function parseGridColumns(className: string): number {
  const match = className.match(/grid-cols-(\d+)/);
  return parseInt(match?.[1] || '2');
}

/**
 * Parse gap from Tailwind class
 * @example parseGap('gap-4') => 16
 */
export function parseGap(className?: string): number {
  if (!className) return 16;

  const match = className.match(/gap-(\d+)/);
  if (match) {
    return parseInt(match[1]) * 4; // Tailwind uses 4px base
  }

  return 16;
}

/**
 * Parse justify-content from Tailwind class
 */
export function parseJustifyContent(className?: string): string {
  if (!className) return 'flex-start';

  if (className.includes('justify-center')) return 'center';
  if (className.includes('justify-between')) return 'space-between';
  if (className.includes('justify-around')) return 'space-around';
  if (className.includes('justify-end')) return 'flex-end';

  return 'flex-start';
}

/**
 * Parse align-items from Tailwind class
 */
export function parseAlignItems(className?: string): string {
  if (!className) return 'stretch';

  if (className.includes('items-center')) return 'center';
  if (className.includes('items-start')) return 'flex-start';
  if (className.includes('items-end')) return 'flex-end';
  if (className.includes('items-baseline')) return 'baseline';

  return 'stretch';
}

/**
 * Parse padding from Tailwind class
 * @example parsePadding('p-4') => { top: 16, right: 16, bottom: 16, left: 16 }
 */
export function parsePadding(className?: string): { top: number; right: number; bottom: number; left: number } {
  const defaultPadding = { top: 0, right: 0, bottom: 0, left: 0 };
  if (!className) return defaultPadding;

  // p-4 (all sides)
  const pMatch = className.match(/\bp-(\d+)/);
  if (pMatch) {
    const value = parseInt(pMatch[1]) * 4;
    return { top: value, right: value, bottom: value, left: value };
  }

  // px-4, py-4
  const pxMatch = className.match(/\bpx-(\d+)/);
  const pyMatch = className.match(/\bpy-(\d+)/);
  const ptMatch = className.match(/\bpt-(\d+)/);
  const prMatch = className.match(/\bpr-(\d+)/);
  const pbMatch = className.match(/\bpb-(\d+)/);
  const plMatch = className.match(/\bpl-(\d+)/);

  return {
    top: (pyMatch ? parseInt(pyMatch[1]) * 4 : 0) || (ptMatch ? parseInt(ptMatch[1]) * 4 : 0),
    right: (pxMatch ? parseInt(pxMatch[1]) * 4 : 0) || (prMatch ? parseInt(prMatch[1]) * 4 : 0),
    bottom: (pyMatch ? parseInt(pyMatch[1]) * 4 : 0) || (pbMatch ? parseInt(pbMatch[1]) * 4 : 0),
    left: (pxMatch ? parseInt(pxMatch[1]) * 4 : 0) || (plMatch ? parseInt(plMatch[1]) * 4 : 0),
  };
}

/**
 * Parse border radius from Tailwind class
 * @example parseBorderRadius('rounded-lg') => 8
 */
export function parseBorderRadius(className?: string): number {
  if (!className) return 0;

  const radiusMap: Record<string, number> = {
    'sm': 2,
    '': 4,
    'md': 6,
    'lg': 8,
    'xl': 12,
    '2xl': 16,
    '3xl': 24,
    'full': 9999,
  };

  const match = className.match(/rounded(?:-(sm|md|lg|xl|2xl|3xl|full))?/);
  if (match) {
    return radiusMap[match[1] || ''] || 4;
  }

  return 0;
}

/**
 * Parse text alignment from Tailwind class
 * @example parseTextAlign('text-center') => 'center'
 */
export function parseTextAlign(className?: string): string {
  if (!className) return 'left';

  if (className.includes('text-center')) return 'center';
  if (className.includes('text-right')) return 'right';
  if (className.includes('text-justify')) return 'justify';

  return 'left';
}

/**
 * Check if element has flex display
 */
export function hasFlex(className?: string): boolean {
  return className?.includes('flex') || false;
}

/**
 * Check if element has grid display
 */
export function hasGrid(className?: string): boolean {
  return className?.includes('grid') && className?.includes('grid-cols-') || false;
}

/**
 * Parse flex direction from Tailwind class
 */
export function parseFlexDirection(className?: string): string {
  if (!className) return 'row';

  if (className.includes('flex-col')) return 'column';
  if (className.includes('flex-row-reverse')) return 'row-reverse';
  if (className.includes('flex-col-reverse')) return 'column-reverse';

  return 'row';
}
