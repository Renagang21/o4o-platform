/**
 * AGSection - Antigravity Design System Section
 *
 * Phase 7-A: Page section component
 *
 * Features:
 * - Section title and description
 * - Spacing control
 * - Optional divider
 */

import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';

export type AGSectionSpacing = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface AGSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  description?: string;
  action?: ReactNode;
  spacing?: AGSectionSpacing;
  divider?: boolean;
}

const spacingStyles: Record<AGSectionSpacing, string> = {
  none: 'py-0',
  sm: 'py-4',
  md: 'py-6',
  lg: 'py-8',
  xl: 'py-12',
};

export const AGSection = forwardRef<HTMLElement, AGSectionProps>(
  (
    {
      title,
      description,
      action,
      spacing = 'md',
      divider = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const classes = [
      spacingStyles[spacing],
      divider ? 'border-b border-gray-200' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <section ref={ref} className={classes} {...props}>
        {/* Section Header */}
        {(title || action) && (
          <div className="flex items-start justify-between mb-4">
            <div>
              {title && (
                typeof title === 'string' ? (
                  <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                ) : (
                  title
                )
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
            {action && <div className="flex-shrink-0 ml-4">{action}</div>}
          </div>
        )}

        {/* Section Content */}
        {children}
      </section>
    );
  }
);

AGSection.displayName = 'AGSection';

export default AGSection;
