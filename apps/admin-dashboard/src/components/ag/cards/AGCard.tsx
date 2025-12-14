/**
 * AGCard - Card Component
 *
 * Phase 7-C: Global Components
 *
 * Features:
 * - Header/Body/Footer slots
 * - Multiple padding sizes
 * - Shadow/Border variants
 * - Hoverable state
 */

import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';

export type AGCardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface AGCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card padding */
  padding?: AGCardPadding;
  /** Show shadow */
  shadow?: boolean | 'sm' | 'md' | 'lg';
  /** Show border */
  border?: boolean;
  /** Hoverable effect */
  hoverable?: boolean;
  /** Card header */
  header?: ReactNode;
  /** Card footer */
  footer?: ReactNode;
  /** Header padding (inherits from padding if not set) */
  headerPadding?: AGCardPadding;
  /** Footer padding (inherits from padding if not set) */
  footerPadding?: AGCardPadding;
  /** Header border */
  headerBorder?: boolean;
  /** Footer border */
  footerBorder?: boolean;
}

const paddingClasses: Record<AGCardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const shadowClasses = {
  true: 'shadow',
  sm: 'shadow-sm',
  md: 'shadow-md',
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
      headerPadding,
      footerPadding,
      headerBorder = true,
      footerBorder = true,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const shadowClass = shadow === false ? '' : shadowClasses[shadow === true ? 'true' : shadow];

    return (
      <div
        ref={ref}
        className={`
          bg-white rounded-lg
          ${shadowClass}
          ${border ? 'border border-gray-200' : ''}
          ${hoverable ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}
          ${className}
        `}
        {...props}
      >
        {/* Header */}
        {header && (
          <div
            className={`
              ${paddingClasses[headerPadding ?? padding]}
              ${headerBorder ? 'border-b border-gray-200' : ''}
            `}
          >
            {header}
          </div>
        )}

        {/* Body */}
        <div className={paddingClasses[padding]}>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className={`
              ${paddingClasses[footerPadding ?? padding]}
              ${footerBorder ? 'border-t border-gray-200' : ''}
            `}
          >
            {footer}
          </div>
        )}
      </div>
    );
  }
);

AGCard.displayName = 'AGCard';

/**
 * AGCardHeader - Card header component
 */
export interface AGCardHeaderProps {
  /** Title */
  title: string;
  /** Subtitle */
  subtitle?: string;
  /** Action element */
  action?: ReactNode;
  /** Icon */
  icon?: ReactNode;
  /** Custom class name */
  className?: string;
}

export function AGCardHeader({
  title,
  subtitle,
  action,
  icon,
  className = '',
}: AGCardHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export default AGCard;
