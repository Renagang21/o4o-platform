/**
 * Design System - Tag Component
 *
 * Interactive tags with optional close button
 */

import { forwardRef } from 'react';
import { cn } from '../utils/classnames';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md';
  closable?: boolean;
  onClose?: () => void;
}

export const Tag = forwardRef<HTMLSpanElement, TagProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      closable = false,
      onClose,
      className,
      ...rest
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center gap-1 font-medium rounded';

    const variantStyles = {
      default: 'bg-neutral-100 text-neutral-900 border border-neutral-300',
      primary: 'bg-primary/10 text-primary border border-primary/20',
      success: 'bg-success/10 text-success border border-success/20',
      danger: 'bg-danger/10 text-danger border border-danger/20',
      warning: 'bg-warning/10 text-warning border border-warning/20',
    };

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
    };

    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...rest}
      >
        {children}
        {closable && (
          <button
            type="button"
            onClick={onClose}
            className="ml-1 hover:opacity-70 transition-opacity"
            aria-label="Remove tag"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Tag.displayName = 'Tag';
