/**
 * Design System - Section Component
 *
 * Page section container with consistent spacing and optional title
 */

import { forwardRef } from 'react';
import { cn } from '../utils/classnames';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  container?: boolean;
}

export const Section = forwardRef<HTMLElement, SectionProps>(
  (
    {
      title,
      subtitle,
      padding = 'md',
      container = false,
      children,
      className,
      ...rest
    },
    ref
  ) => {
    const paddingStyles = {
      none: '',
      sm: 'py-4',
      md: 'py-8',
      lg: 'py-12',
    };

    return (
      <section
        ref={ref}
        className={cn(paddingStyles[padding], className)}
        {...rest}
      >
        <div className={cn(container && 'max-w-7xl mx-auto px-4')}>
          {(title || subtitle) && (
            <div className="mb-6">
              {title && (
                <h2 className="text-2xl font-bold text-neutral-900">{title}</h2>
              )}
              {subtitle && (
                <p className="text-neutral-600 mt-2">{subtitle}</p>
              )}
            </div>
          )}
          {children}
        </div>
      </section>
    );
  }
);

Section.displayName = 'Section';
