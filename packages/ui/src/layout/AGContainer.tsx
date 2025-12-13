/**
 * AGContainer - Antigravity Design System Container
 *
 * Phase 7-A: Layout container component
 *
 * Features:
 * - Max-width management
 * - Padding rules
 * - Centered content
 */

import React, { forwardRef, HTMLAttributes } from 'react';

export type AGContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface AGContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: AGContainerSize;
  padding?: boolean;
  centered?: boolean;
}

const sizeStyles: Record<AGContainerSize, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  full: 'max-w-full',
};

export const AGContainer = forwardRef<HTMLDivElement, AGContainerProps>(
  (
    {
      size = 'lg',
      padding = true,
      centered = true,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const classes = [
      sizeStyles[size],
      padding ? 'px-4 sm:px-6 lg:px-8' : '',
      centered ? 'mx-auto' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

AGContainer.displayName = 'AGContainer';

export default AGContainer;
