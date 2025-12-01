/**
 * Tailwind → Appearance Token Mapper
 * Parses Tailwind CSS classes and converts them to O4O block attributes
 */

// Font Size Mapping (text-{size})
const FONT_SIZE_MAP: Record<string, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  '8xl': 96,
  '9xl': 128,
};

// Color Mapping (text-{color}, bg-{color})
const COLOR_MAP: Record<string, string> = {
  // Gray
  'gray-50': '#f9fafb',
  'gray-100': '#f3f4f6',
  'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db',
  'gray-400': '#9ca3af',
  'gray-500': '#6b7280',
  'gray-600': '#4b5563',
  'gray-700': '#374151',
  'gray-800': '#1f2937',
  'gray-900': '#111827',
  // Blue
  'blue-50': '#eff6ff',
  'blue-100': '#dbeafe',
  'blue-200': '#bfdbfe',
  'blue-300': '#93c5fd',
  'blue-400': '#60a5fa',
  'blue-500': '#3b82f6',
  'blue-600': '#2563eb',
  'blue-700': '#1d4ed8',
  'blue-800': '#1e40af',
  'blue-900': '#1e3a8a',
  // Red
  'red-50': '#fef2f2',
  'red-100': '#fee2e2',
  'red-200': '#fecaca',
  'red-300': '#fca5a5',
  'red-400': '#f87171',
  'red-500': '#ef4444',
  'red-600': '#dc2626',
  'red-700': '#b91c1c',
  'red-800': '#991b1b',
  'red-900': '#7f1d1d',
  // Green
  'green-50': '#f0fdf4',
  'green-100': '#dcfce7',
  'green-200': '#bbf7d0',
  'green-300': '#86efac',
  'green-400': '#4ade80',
  'green-500': '#22c55e',
  'green-600': '#16a34a',
  'green-700': '#15803d',
  'green-800': '#166534',
  'green-900': '#14532d',
  // Yellow
  'yellow-50': '#fefce8',
  'yellow-100': '#fef9c3',
  'yellow-200': '#fef08a',
  'yellow-300': '#fde047',
  'yellow-400': '#facc15',
  'yellow-500': '#eab308',
  'yellow-600': '#ca8a04',
  'yellow-700': '#a16207',
  'yellow-800': '#854d0e',
  'yellow-900': '#713f12',
  // Named colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

// Border Radius Mapping (rounded-{size})
const BORDER_RADIUS_MAP: Record<string, number> = {
  none: 0,
  sm: 2,
  '': 4, // rounded (default)
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
};

export class TailwindMapper {
  /**
   * Parse font size from Tailwind classes
   * Example: "text-3xl" → 30
   */
  static parseFontSize(className: string): number | undefined {
    const match = className.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)/);
    if (match) {
      return FONT_SIZE_MAP[match[1]];
    }
    return undefined;
  }

  /**
   * Parse text color from Tailwind classes
   * Example: "text-blue-600" → "#2563eb"
   */
  static parseTextColor(className: string): string | undefined {
    const match = className.match(/text-([\w-]+)/);
    if (match && match[1] in COLOR_MAP) {
      return COLOR_MAP[match[1]];
    }
    return undefined;
  }

  /**
   * Parse background color from Tailwind classes
   * Example: "bg-gray-100" → "#f3f4f6"
   */
  static parseBackgroundColor(className: string): string | undefined {
    const match = className.match(/bg-([\w-]+)/);
    if (match && match[1] in COLOR_MAP) {
      return COLOR_MAP[match[1]];
    }
    return undefined;
  }

  /**
   * Parse text alignment from Tailwind classes
   * Example: "text-center" → "center"
   */
  static parseTextAlign(className: string): 'left' | 'center' | 'right' | 'justify' | undefined {
    if (className.includes('text-left')) return 'left';
    if (className.includes('text-center')) return 'center';
    if (className.includes('text-right')) return 'right';
    if (className.includes('text-justify')) return 'justify';
    return undefined;
  }

  /**
   * Parse padding from Tailwind classes
   * Example: "p-4" → { top: 16, right: 16, bottom: 16, left: 16 }
   * Example: "px-6 py-3" → { top: 12, right: 24, bottom: 12, left: 24 }
   */
  static parsePadding(className: string): {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  } {
    const padding: Record<string, number> = {};

    // All sides: p-{n}
    const pMatch = className.match(/\bp-(\d+)/);
    if (pMatch) {
      const value = parseInt(pMatch[1]) * 4;
      return { top: value, right: value, bottom: value, left: value };
    }

    // Horizontal: px-{n}
    const pxMatch = className.match(/\bpx-(\d+)/);
    if (pxMatch) {
      const value = parseInt(pxMatch[1]) * 4;
      padding.left = value;
      padding.right = value;
    }

    // Vertical: py-{n}
    const pyMatch = className.match(/\bpy-(\d+)/);
    if (pyMatch) {
      const value = parseInt(pyMatch[1]) * 4;
      padding.top = value;
      padding.bottom = value;
    }

    // Individual sides
    const ptMatch = className.match(/\bpt-(\d+)/);
    if (ptMatch) padding.top = parseInt(ptMatch[1]) * 4;

    const prMatch = className.match(/\bpr-(\d+)/);
    if (prMatch) padding.right = parseInt(prMatch[1]) * 4;

    const pbMatch = className.match(/\bpb-(\d+)/);
    if (pbMatch) padding.bottom = parseInt(pbMatch[1]) * 4;

    const plMatch = className.match(/\bpl-(\d+)/);
    if (plMatch) padding.left = parseInt(plMatch[1]) * 4;

    return padding;
  }

  /**
   * Parse gap from Tailwind classes
   * Example: "gap-4" → 16
   */
  static parseGap(className: string): number | undefined {
    const match = className.match(/\bgap-(\d+)/);
    if (match) {
      return parseInt(match[1]) * 4; // 4px base
    }
    return undefined;
  }

  /**
   * Parse border radius from Tailwind classes
   * Example: "rounded-lg" → 8
   */
  static parseBorderRadius(className: string): number | undefined {
    const match = className.match(/rounded(?:-(\w+))?/);
    if (match) {
      const size = match[1] || '';
      return BORDER_RADIUS_MAP[size];
    }
    return undefined;
  }

  /**
   * Check if className has grid layout
   * Example: "grid grid-cols-3" → true
   */
  static hasGrid(className: string): boolean {
    return /\bgrid\b/.test(className);
  }

  /**
   * Check if className has flex layout
   * Example: "flex flex-col" → true
   */
  static hasFlex(className: string): boolean {
    return /\bflex\b/.test(className);
  }

  /**
   * Parse grid column count
   * Example: "grid-cols-3" → 3
   */
  static parseGridCols(className: string): number | undefined {
    const match = className.match(/grid-cols-(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    return undefined;
  }

  /**
   * Parse flex direction
   * Example: "flex-col" → "column"
   */
  static parseFlexDirection(className: string): 'row' | 'column' | 'row-reverse' | 'column-reverse' | undefined {
    if (className.includes('flex-col-reverse')) return 'column-reverse';
    if (className.includes('flex-col')) return 'column';
    if (className.includes('flex-row-reverse')) return 'row-reverse';
    if (className.includes('flex-row')) return 'row';
    return undefined;
  }

  /**
   * Parse justify content
   * Example: "justify-center" → "center"
   */
  static parseJustifyContent(className: string): string | undefined {
    if (className.includes('justify-start')) return 'flex-start';
    if (className.includes('justify-end')) return 'flex-end';
    if (className.includes('justify-center')) return 'center';
    if (className.includes('justify-between')) return 'space-between';
    if (className.includes('justify-around')) return 'space-around';
    if (className.includes('justify-evenly')) return 'space-evenly';
    return undefined;
  }

  /**
   * Parse align items
   * Example: "items-center" → "center"
   */
  static parseAlignItems(className: string): string | undefined {
    if (className.includes('items-start')) return 'flex-start';
    if (className.includes('items-end')) return 'flex-end';
    if (className.includes('items-center')) return 'center';
    if (className.includes('items-baseline')) return 'baseline';
    if (className.includes('items-stretch')) return 'stretch';
    return undefined;
  }

  /**
   * Parse width from Tailwind classes
   * Example: "w-64" → 256
   */
  static parseWidth(className: string): number | string | undefined {
    const match = className.match(/\bw-(\d+)/);
    if (match) {
      return parseInt(match[1]) * 4; // 4px base
    }
    if (className.includes('w-full')) return '100%';
    if (className.includes('w-1/2')) return '50%';
    if (className.includes('w-1/3')) return '33.33%';
    if (className.includes('w-2/3')) return '66.67%';
    if (className.includes('w-1/4')) return '25%';
    if (className.includes('w-3/4')) return '75%';
    return undefined;
  }

  /**
   * Parse height from Tailwind classes
   * Example: "h-64" → 256
   */
  static parseHeight(className: string): number | string | undefined {
    const match = className.match(/\bh-(\d+)/);
    if (match) {
      return parseInt(match[1]) * 4; // 4px base
    }
    if (className.includes('h-full')) return '100%';
    if (className.includes('h-screen')) return '100vh';
    return undefined;
  }
}
