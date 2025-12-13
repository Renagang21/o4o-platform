/**
 * AGContent - Antigravity Design System Content Wrapper
 *
 * Phase 7-B: Main content area component
 *
 * Features:
 * - Consistent padding and max-width
 * - Optional full-width mode
 * - Background options
 * - Loading state
 */

import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';

export type AGContentPadding = 'none' | 'sm' | 'md' | 'lg';
export type AGContentMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface AGContentProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Padding size */
  padding?: AGContentPadding;
  /** Max width constraint */
  maxWidth?: AGContentMaxWidth;
  /** Center content horizontally */
  centered?: boolean;
  /** Background color */
  background?: 'default' | 'white' | 'gray';
  /** Show loading state */
  loading?: boolean;
  /** Loading skeleton content */
  loadingContent?: ReactNode;
  /** Min height (fills available space) */
  fullHeight?: boolean;
}

const paddingStyles: Record<AGContentPadding, string> = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

const maxWidthStyles: Record<AGContentMaxWidth, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-full',
};

const backgroundStyles = {
  default: 'bg-gray-50',
  white: 'bg-white',
  gray: 'bg-gray-100',
};

/** Default loading skeleton */
function DefaultLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-72 bg-gray-200 rounded" />
      </div>

      {/* Content skeleton */}
      <div className="bg-white rounded-lg p-6 shadow-sm space-y-4">
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-5/6 bg-gray-200 rounded" />
        <div className="h-4 w-4/6 bg-gray-200 rounded" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="h-6 w-32 bg-gray-200 rounded" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 border-b border-gray-100 flex gap-4">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export const AGContent = forwardRef<HTMLDivElement, AGContentProps>(
  (
    {
      padding = 'md',
      maxWidth = 'full',
      centered = false,
      background = 'default',
      loading = false,
      loadingContent,
      fullHeight = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const classes = [
      paddingStyles[padding],
      backgroundStyles[background],
      fullHeight ? 'min-h-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const innerClasses = [
      maxWidthStyles[maxWidth],
      centered ? 'mx-auto' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classes} {...props}>
        <div className={innerClasses}>
          {loading ? (
            loadingContent || <DefaultLoadingSkeleton />
          ) : (
            children
          )}
        </div>
      </div>
    );
  }
);

AGContent.displayName = 'AGContent';

export default AGContent;
