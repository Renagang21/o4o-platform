/**
 * Layout Engine - Row/Column Grid System with Responsive Breakpoints
 *
 * Automatically converts span values to Tailwind CSS classes
 */

export interface ResponsiveSpan {
  span?: number; // Default (mobile-first)
  spanSm?: number; // Small screens (640px+)
  spanMd?: number; // Medium screens (768px+)
  spanLg?: number; // Large screens (1024px+)
  spanXl?: number; // Extra large screens (1280px+)
  offset?: number; // Left margin offset
}

/**
 * Convert span value (1-12) to Tailwind basis class
 */
export function spanToBasisClass(span: number): string {
  const spanMap: Record<number, string> = {
    1: 'basis-1/12',
    2: 'basis-1/6',
    3: 'basis-1/4',
    4: 'basis-1/3',
    5: 'basis-5/12',
    6: 'basis-1/2',
    7: 'basis-7/12',
    8: 'basis-2/3',
    9: 'basis-3/4',
    10: 'basis-5/6',
    11: 'basis-11/12',
    12: 'basis-full',
  };

  return spanMap[span] || 'basis-full';
}

/**
 * Generate responsive Tailwind classes from ResponsiveSpan
 */
export function generateResponsiveClasses(responsive: ResponsiveSpan): string {
  const classes: string[] = [];

  // Default (mobile-first)
  if (responsive.span) {
    classes.push(spanToBasisClass(responsive.span));
  }

  // Small screens
  if (responsive.spanSm) {
    classes.push(`sm:${spanToBasisClass(responsive.spanSm)}`);
  }

  // Medium screens
  if (responsive.spanMd) {
    classes.push(`md:${spanToBasisClass(responsive.spanMd)}`);
  }

  // Large screens
  if (responsive.spanLg) {
    classes.push(`lg:${spanToBasisClass(responsive.spanLg)}`);
  }

  // Extra large screens
  if (responsive.spanXl) {
    classes.push(`xl:${spanToBasisClass(responsive.spanXl)}`);
  }

  // Offset (margin-left)
  if (responsive.offset) {
    const offsetMap: Record<number, string> = {
      1: 'ml-[8.333333%]',
      2: 'ml-[16.666667%]',
      3: 'ml-[25%]',
      4: 'ml-[33.333333%]',
      5: 'ml-[41.666667%]',
      6: 'ml-[50%]',
      7: 'ml-[58.333333%]',
      8: 'ml-[66.666667%]',
      9: 'ml-[75%]',
      10: 'ml-[83.333333%]',
      11: 'ml-[91.666667%]',
    };
    classes.push(offsetMap[responsive.offset] || '');
  }

  return classes.join(' ');
}

/**
 * Generate Row container classes
 */
export function getRowClasses(props: {
  gap?: string;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}): string {
  const classes: string[] = ['flex', 'flex-row', 'flex-wrap'];

  // Gap
  if (props.gap) {
    classes.push(props.gap);
  } else {
    classes.push('gap-4');
  }

  // Align items (vertical)
  const alignMap = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };
  classes.push(alignMap[props.align || 'stretch']);

  // Justify content (horizontal)
  const justifyMap = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  };
  classes.push(justifyMap[props.justify || 'start']);

  return classes.join(' ');
}

/**
 * Generate Column container classes
 */
export function getColumnClasses(props: ResponsiveSpan): string {
  const baseClasses = ['flex', 'flex-col'];
  const responsiveClasses = generateResponsiveClasses(props);

  return [...baseClasses, responsiveClasses].join(' ');
}

/**
 * Validate Row/Column structure
 */
export function validateLayout(node: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Row should only contain Column children
  if (node.type === 'Row') {
    const hasNonColumnChildren = node.children.some((child: any) => child.type !== 'Column');
    if (hasNonColumnChildren) {
      errors.push('Row should only contain Column components');
    }
  }

  // Column span validation
  if (node.type === 'Column') {
    const span = node.props.span;
    if (span && (span < 1 || span > 12)) {
      errors.push('Column span must be between 1 and 12');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
