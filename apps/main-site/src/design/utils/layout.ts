/**
 * Design System - Layout Utilities
 *
 * Utilities for common layout patterns
 */

import { cn } from './classnames';

/**
 * Generate flex container classes
 */
export function flex(options?: {
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
  wrap?: boolean;
  gap?: string;
}): string {
  const {
    direction = 'row',
    justify,
    align,
    wrap,
    gap,
  } = options || {};

  return cn(
    'flex',
    `flex-${direction}`,
    justify && `justify-${justify}`,
    align && `items-${align}`,
    wrap && 'flex-wrap',
    gap
  );
}

/**
 * Generate grid container classes
 */
export function grid(options?: {
  cols?: number | 'auto';
  rows?: number | 'auto';
  gap?: string;
}): string {
  const { cols, rows, gap } = options || {};

  return cn(
    'grid',
    cols !== undefined && (cols === 'auto' ? 'grid-cols-auto' : `grid-cols-${cols}`),
    rows !== undefined && (rows === 'auto' ? 'grid-rows-auto' : `grid-rows-${rows}`),
    gap
  );
}

/**
 * Generate stack layout (vertical spacing between children)
 */
export function stack(spacing: string = 'gap-4'): string {
  return cn('flex flex-col', spacing);
}

/**
 * Generate inline layout (horizontal spacing between children)
 */
export function inline(spacing: string = 'gap-4'): string {
  return cn('flex flex-row', spacing);
}

/**
 * Generate container classes with max-width
 */
export function container(size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'): string {
  const sizes = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  };

  return cn('mx-auto px-4', size && sizes[size]);
}

/**
 * Generate responsive breakpoint classes
 */
export function responsive(
  base: string,
  sm?: string,
  md?: string,
  lg?: string,
  xl?: string
): string {
  return cn(
    base,
    sm && `sm:${sm}`,
    md && `md:${md}`,
    lg && `lg:${lg}`,
    xl && `xl:${xl}`
  );
}
