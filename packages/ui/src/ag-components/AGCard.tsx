/**
 * AGCard - Antigravity Design System Card
 *
 * Phase 7-A: Core card component
 *
 * Features:
 * - Header, body, footer slots
 * - Shadow options
 * - Border options
 * - Padding options
 * - Hover effect option
 */

import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';

export type AGCardPadding = 'none' | 'sm' | 'md' | 'lg';
export type AGCardShadow = 'none' | 'sm' | 'md' | 'lg';

export interface AGCardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: AGCardPadding;
  shadow?: AGCardShadow;
  border?: boolean;
  hoverable?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
}

const paddingStyles: Record<AGCardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const shadowStyles: Record<AGCardShadow, string> = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow',
  lg: 'shadow-lg',
};

export const AGCard = forwardRef<HTMLDivElement, AGCardProps>(
  (
    {
      padding = 'md',
      shadow = 'sm',
      border = true,
      hoverable = false,
      header,
      footer,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      bg-white rounded-lg
      ${border ? 'border border-gray-200' : ''}
      ${shadowStyles[shadow]}
      ${hoverable ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}
    `;

    const classes = [baseStyles, className]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return (
      <div ref={ref} className={classes} {...props}>
        {header && (
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            {header}
          </div>
        )}
        <div className={paddingStyles[padding]}>{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

AGCard.displayName = 'AGCard';

// Sub-components for more flexible usage
export const AGCardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg ${className}`}
    {...props}
  />
));
AGCardHeader.displayName = 'AGCardHeader';

export const AGCardBody = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { padding?: AGCardPadding }
>(({ className = '', padding = 'md', ...props }, ref) => (
  <div
    ref={ref}
    className={`${paddingStyles[padding]} ${className}`}
    {...props}
  />
));
AGCardBody.displayName = 'AGCardBody';

export const AGCardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg ${className}`}
    {...props}
  />
));
AGCardFooter.displayName = 'AGCardFooter';

export default AGCard;
