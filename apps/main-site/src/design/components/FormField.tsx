/**
 * Design System - FormField Component
 *
 * Wrapper component for form inputs with label and helper text
 */

import { forwardRef } from 'react';
import { cn } from '../utils/classnames';

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  fullWidth?: boolean;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      label,
      helperText,
      error,
      required = false,
      fullWidth = false,
      children,
      className,
      ...rest
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('space-y-1', fullWidth && 'w-full', className)}
        {...rest}
      >
        {label && (
          <label className="block text-sm font-medium text-neutral-900">
            {label}
            {required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        {children}
        {(helperText || error) && (
          <p className={cn('text-sm', error ? 'text-danger' : 'text-neutral-500')}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
