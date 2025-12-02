/**
 * Design System - Input Component
 *
 * Unified input component for forms
 */

import { forwardRef } from 'react';
import { cn } from '../utils/classnames';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      error = false,
      helperText,
      fullWidth = false,
      className,
      ...rest
    },
    ref
  ) => {
    const baseStyles = 'border rounded-md px-3 py-2 text-base transition-colors focus:outline-none focus:ring-2';

    const stateStyles = error
      ? 'border-danger focus:ring-danger focus:border-danger'
      : 'border-neutral-300 focus:ring-primary focus:border-primary';

    return (
      <div className={cn(fullWidth && 'w-full')}>
        <input
          ref={ref}
          className={cn(
            baseStyles,
            stateStyles,
            fullWidth && 'w-full',
            'disabled:bg-neutral-100 disabled:cursor-not-allowed',
            className
          )}
          {...rest}
        />
        {helperText && (
          <p className={cn('mt-1 text-sm', error ? 'text-danger' : 'text-neutral-500')}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * Textarea Component
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      error = false,
      helperText,
      fullWidth = false,
      className,
      ...rest
    },
    ref
  ) => {
    const baseStyles = 'border rounded-md px-3 py-2 text-base transition-colors focus:outline-none focus:ring-2 resize-y';

    const stateStyles = error
      ? 'border-danger focus:ring-danger focus:border-danger'
      : 'border-neutral-300 focus:ring-primary focus:border-primary';

    return (
      <div className={cn(fullWidth && 'w-full')}>
        <textarea
          ref={ref}
          className={cn(
            baseStyles,
            stateStyles,
            fullWidth && 'w-full',
            'disabled:bg-neutral-100 disabled:cursor-not-allowed',
            className
          )}
          {...rest}
        />
        {helperText && (
          <p className={cn('mt-1 text-sm', error ? 'text-danger' : 'text-neutral-500')}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
