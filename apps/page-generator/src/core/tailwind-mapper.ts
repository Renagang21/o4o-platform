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

// Opacity Mapping (opacity-{value})
const OPACITY_MAP: Record<string, number> = {
  '0': 0,
  '5': 0.05,
  '10': 0.1,
  '20': 0.2,
  '25': 0.25,
  '30': 0.3,
  '40': 0.4,
  '50': 0.5,
  '60': 0.6,
  '70': 0.7,
  '75': 0.75,
  '80': 0.8,
  '90': 0.9,
  '95': 0.95,
  '100': 1,
};

// Shadow Mapping (shadow-{size})
const SHADOW_MAP: Record<string, string> = {
  'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  '': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  'none': 'none',
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

  /**
   * Parse opacity from Tailwind classes
   * Example: "opacity-50" → 0.5
   */
  static parseOpacity(className: string): number | undefined {
    const match = className.match(/\bopacity-(\d+)/);
    if (match && match[1] in OPACITY_MAP) {
      return OPACITY_MAP[match[1]];
    }
    return undefined;
  }

  /**
   * Parse box shadow from Tailwind classes
   * Example: "shadow-lg" → "0 10px 15px -3px rgb(0 0 0 / 0.1), ..."
   */
  static parseShadow(className: string): string | undefined {
    const match = className.match(/\bshadow(?:-(\w+))?/);
    if (match) {
      const size = match[1] || '';
      return SHADOW_MAP[size];
    }
    return undefined;
  }

  /**
   * Parse flex wrap from Tailwind classes
   * Example: "flex-wrap" → "wrap"
   */
  static parseFlexWrap(className: string): 'wrap' | 'nowrap' | 'wrap-reverse' | undefined {
    if (className.includes('flex-wrap-reverse')) return 'wrap-reverse';
    if (className.includes('flex-wrap')) return 'wrap';
    if (className.includes('flex-nowrap')) return 'nowrap';
    return undefined;
  }

  /**
   * Parse alpha colors (e.g., bg-white/50, text-black/20)
   * Example: "bg-white/50" → "rgba(255, 255, 255, 0.5)"
   */
  static parseAlphaColor(className: string, prefix: 'bg' | 'text'): string | undefined {
    const pattern = new RegExp(`\\b${prefix}-(\\w+)/(\\d+)\\b`);
    const match = className.match(pattern);

    if (!match) return undefined;

    const colorName = match[1];
    const alpha = parseInt(match[2]) / 100;

    // Get base color
    const baseColor = COLOR_MAP[colorName];
    if (!baseColor || baseColor === 'transparent') return undefined;

    // Convert hex to rgba
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Parse backdrop blur from Tailwind classes
   * Example: "backdrop-blur-md" → "blur(12px)"
   */
  static parseBackdropBlur(className: string): string | undefined {
    if (className.includes('backdrop-blur-none')) return 'blur(0)';
    if (className.includes('backdrop-blur-sm')) return 'blur(4px)';
    if (className.includes('backdrop-blur-md')) return 'blur(12px)';
    if (className.includes('backdrop-blur-lg')) return 'blur(16px)';
    if (className.includes('backdrop-blur-xl')) return 'blur(24px)';
    if (className.includes('backdrop-blur-2xl')) return 'blur(40px)';
    if (className.includes('backdrop-blur-3xl')) return 'blur(64px)';
    if (className.includes('backdrop-blur')) return 'blur(8px)'; // default
    return undefined;
  }

  /**
   * Parse object-fit from Tailwind classes
   * Example: "object-cover" → "cover"
   */
  static parseObjectFit(className: string): 'contain' | 'cover' | 'fill' | 'none' | 'scale-down' | undefined {
    if (className.includes('object-contain')) return 'contain';
    if (className.includes('object-cover')) return 'cover';
    if (className.includes('object-fill')) return 'fill';
    if (className.includes('object-none')) return 'none';
    if (className.includes('object-scale-down')) return 'scale-down';
    return undefined;
  }

  /**
   * Parse border-left from Tailwind classes
   * Example: "border-l-4" → { width: 4 }
   * Example: "border-l-4 border-blue-500" → { width: 4, color: "#2563eb" }
   */
  static parseBorderLeft(className: string): { width?: number; color?: string } | undefined {
    const borderLeft: { width?: number; color?: string } = {};

    // border-l-{width}
    const widthMatch = className.match(/\bborder-l(?:-(\d+))?/);
    if (widthMatch) {
      borderLeft.width = widthMatch[1] ? parseInt(widthMatch[1]) : 1;
    }

    // border-{color}
    const colorMatch = className.match(/\bborder-([\w-]+)/);
    if (colorMatch && colorMatch[1] in COLOR_MAP && !colorMatch[1].startsWith('l')) {
      borderLeft.color = COLOR_MAP[colorMatch[1]];
    }

    return Object.keys(borderLeft).length > 0 ? borderLeft : undefined;
  }

  /**
   * Parse position from Tailwind classes
   * Example: "absolute" → "absolute"
   */
  static parsePosition(className: string): 'relative' | 'absolute' | 'fixed' | 'sticky' | undefined {
    if (className.includes('absolute')) return 'absolute';
    if (className.includes('fixed')) return 'fixed';
    if (className.includes('sticky')) return 'sticky';
    if (className.includes('relative')) return 'relative';
    return undefined;
  }

  /**
   * Parse inset values from Tailwind classes
   * Example: "inset-0" → { top: 0, right: 0, bottom: 0, left: 0 }
   * Example: "inset-x-4" → { left: 16, right: 16 }
   * Example: "inset-y-2" → { top: 8, bottom: 8 }
   */
  static parseInset(className: string): {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  } | undefined {
    const inset: { top?: number; right?: number; bottom?: number; left?: number } = {};

    // inset-{n} (all sides)
    const insetMatch = className.match(/\binset-(\d+)/);
    if (insetMatch) {
      const value = parseInt(insetMatch[1]) * 4;
      return { top: value, right: value, bottom: value, left: value };
    }

    // inset-x-{n} (left and right)
    const insetXMatch = className.match(/\binset-x-(\d+)/);
    if (insetXMatch) {
      const value = parseInt(insetXMatch[1]) * 4;
      inset.left = value;
      inset.right = value;
    }

    // inset-y-{n} (top and bottom)
    const insetYMatch = className.match(/\binset-y-(\d+)/);
    if (insetYMatch) {
      const value = parseInt(insetYMatch[1]) * 4;
      inset.top = value;
      inset.bottom = value;
    }

    return Object.keys(inset).length > 0 ? inset : undefined;
  }

  /**
   * Parse individual position values from Tailwind classes
   * Example: "top-4" → { top: 16 }
   * Example: "bottom-2 left-6" → { bottom: 8, left: 24 }
   */
  static parsePositionValues(className: string): {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  } | undefined {
    const position: { top?: number; right?: number; bottom?: number; left?: number } = {};

    // top-{n}
    const topMatch = className.match(/\btop-(\d+)/);
    if (topMatch) {
      position.top = parseInt(topMatch[1]) * 4;
    }

    // right-{n}
    const rightMatch = className.match(/\bright-(\d+)/);
    if (rightMatch) {
      position.right = parseInt(rightMatch[1]) * 4;
    }

    // bottom-{n}
    const bottomMatch = className.match(/\bbottom-(\d+)/);
    if (bottomMatch) {
      position.bottom = parseInt(bottomMatch[1]) * 4;
    }

    // left-{n}
    const leftMatch = className.match(/\bleft-(\d+)/);
    if (leftMatch) {
      position.left = parseInt(leftMatch[1]) * 4;
    }

    return Object.keys(position).length > 0 ? position : undefined;
  }

  /**
   * Parse z-index from Tailwind classes
   * Example: "z-10" → 10
   * Example: "z-50" → 50
   */
  static parseZIndex(className: string): number | undefined {
    const match = className.match(/\bz-(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    return undefined;
  }

  /**
   * Parse column span from Tailwind classes
   * Example: "col-span-2" → 2
   * Example: "col-span-full" → 12
   */
  static parseColSpan(className: string): number | undefined {
    if (className.includes('col-span-full')) return 12;
    const match = className.match(/\bcol-span-(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    return undefined;
  }

  /**
   * Parse row span from Tailwind classes
   * Example: "row-span-2" → 2
   * Example: "row-span-full" → 6
   */
  static parseRowSpan(className: string): number | undefined {
    if (className.includes('row-span-full')) return 6;
    const match = className.match(/\brow-span-(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    return undefined;
  }

  /**
   * Parse transform from Tailwind classes
   * Example: "translate-x-4 scale-105 rotate-45" → { translateX: 16, scale: 1.05, rotate: 45 }
   */
  static parseTransform(className: string): {
    translateX?: number;
    translateY?: number;
    scale?: number;
    scaleX?: number;
    scaleY?: number;
    rotate?: number;
    skewX?: number;
    skewY?: number;
  } | undefined {
    const transform: {
      translateX?: number;
      translateY?: number;
      scale?: number;
      scaleX?: number;
      scaleY?: number;
      rotate?: number;
      skewX?: number;
      skewY?: number;
    } = {};

    // translate-x-{n}, translate-y-{n}
    const translateXMatch = className.match(/\btranslate-x-(-?\d+)/);
    if (translateXMatch) {
      transform.translateX = parseInt(translateXMatch[1]) * 4;
    }

    const translateYMatch = className.match(/\btranslate-y-(-?\d+)/);
    if (translateYMatch) {
      transform.translateY = parseInt(translateYMatch[1]) * 4;
    }

    // scale-{n} (100 = 1.0, 105 = 1.05, 95 = 0.95)
    const scaleMatch = className.match(/\bscale-(\d+)/);
    if (scaleMatch) {
      transform.scale = parseInt(scaleMatch[1]) / 100;
    }

    // scale-x-{n}, scale-y-{n}
    const scaleXMatch = className.match(/\bscale-x-(\d+)/);
    if (scaleXMatch) {
      transform.scaleX = parseInt(scaleXMatch[1]) / 100;
    }

    const scaleYMatch = className.match(/\bscale-y-(\d+)/);
    if (scaleYMatch) {
      transform.scaleY = parseInt(scaleYMatch[1]) / 100;
    }

    // rotate-{deg}
    const rotateMatch = className.match(/\brotate-(-?\d+)/);
    if (rotateMatch) {
      transform.rotate = parseInt(rotateMatch[1]);
    }

    // skew-x-{deg}, skew-y-{deg}
    const skewXMatch = className.match(/\bskew-x-(-?\d+)/);
    if (skewXMatch) {
      transform.skewX = parseInt(skewXMatch[1]);
    }

    const skewYMatch = className.match(/\bskew-y-(-?\d+)/);
    if (skewYMatch) {
      transform.skewY = parseInt(skewYMatch[1]);
    }

    return Object.keys(transform).length > 0 ? transform : undefined;
  }

  /**
   * Parse transform origin from Tailwind classes
   * Example: "origin-center" → "center"
   */
  static parseTransformOrigin(className: string): string | undefined {
    if (className.includes('origin-center')) return 'center';
    if (className.includes('origin-top')) return 'top';
    if (className.includes('origin-top-right')) return 'top right';
    if (className.includes('origin-right')) return 'right';
    if (className.includes('origin-bottom-right')) return 'bottom right';
    if (className.includes('origin-bottom')) return 'bottom';
    if (className.includes('origin-bottom-left')) return 'bottom left';
    if (className.includes('origin-left')) return 'left';
    if (className.includes('origin-top-left')) return 'top left';
    return undefined;
  }

  /**
   * Parse transition from Tailwind classes
   * Example: "transition duration-300 ease-in-out" → { duration: 300, ease: "ease-in-out" }
   */
  static parseTransition(className: string): {
    property?: string;
    duration?: number;
    ease?: string;
    delay?: number;
  } | undefined {
    const transition: {
      property?: string;
      duration?: number;
      ease?: string;
      delay?: number;
    } = {};

    // Check if transition is present
    if (className.includes('transition-none')) return undefined;

    if (className.includes('transition-all')) {
      transition.property = 'all';
    } else if (className.includes('transition-colors')) {
      transition.property = 'colors';
    } else if (className.includes('transition-opacity')) {
      transition.property = 'opacity';
    } else if (className.includes('transition-shadow')) {
      transition.property = 'shadow';
    } else if (className.includes('transition-transform')) {
      transition.property = 'transform';
    } else if (className.includes('transition')) {
      transition.property = 'all';
    }

    // duration-{ms}
    const durationMatch = className.match(/\bduration-(\d+)/);
    if (durationMatch) {
      transition.duration = parseInt(durationMatch[1]);
    }

    // ease-{type}
    if (className.includes('ease-linear')) {
      transition.ease = 'linear';
    } else if (className.includes('ease-in-out')) {
      transition.ease = 'ease-in-out';
    } else if (className.includes('ease-in')) {
      transition.ease = 'ease-in';
    } else if (className.includes('ease-out')) {
      transition.ease = 'ease-out';
    }

    // delay-{ms}
    const delayMatch = className.match(/\bdelay-(\d+)/);
    if (delayMatch) {
      transition.delay = parseInt(delayMatch[1]);
    }

    return transition.property ? transition : undefined;
  }

  /**
   * Parse animation from Tailwind classes
   * Example: "animate-spin" → "spin"
   */
  static parseAnimation(className: string): string | undefined {
    if (className.includes('animate-none')) return undefined;
    if (className.includes('animate-spin')) return 'spin';
    if (className.includes('animate-ping')) return 'ping';
    if (className.includes('animate-pulse')) return 'pulse';
    if (className.includes('animate-bounce')) return 'bounce';
    return undefined;
  }
}
