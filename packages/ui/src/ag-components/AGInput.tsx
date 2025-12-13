/**
 * AGInput - Antigravity Design System Input
 *
 * Phase 7-A: Core input component
 *
 * Features:
 * - Label support
 * - Error state with message
 * - Helper text
 * - Disabled/readonly states
 * - Start/end icons
 * - Multiple sizes
 */

import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

export type AGInputSize = 'sm' | 'md' | 'lg';

export interface AGInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  inputSize?: AGInputSize;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  fullWidth?: boolean;
}

const sizeStyles: Record<AGInputSize, string> = {
  sm: 'h-8 text-sm px-2.5',
  md: 'h-10 text-sm px-3',
  lg: 'h-12 text-base px-4',
};

const iconSizeStyles: Record<AGInputSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-5 h-5',
};

export const AGInput = forwardRef<HTMLInputElement, AGInputProps>(
  (
    {
      label,
      error,
      helperText,
      inputSize = 'md',
      startIcon,
      endIcon,
      fullWidth = false,
      className = '',
      disabled,
      readOnly,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `ag-input-${Math.random().toString(36).slice(2, 9)}`;
    const hasError = !!error;

    const baseInputStyles = `
      w-full rounded-md border bg-white
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500
      read-only:bg-gray-50 read-only:cursor-default
    `;

    const stateStyles = hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200';

    const inputClasses = [
      baseInputStyles,
      stateStyles,
      sizeStyles[inputSize],
      startIcon ? 'pl-10' : '',
      endIcon ? 'pr-10' : '',
      className,
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return (
      <div className={fullWidth ? 'w-full' : 'inline-block'}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <span className={iconSizeStyles[inputSize]}>{startIcon}</span>
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <span className={iconSizeStyles[inputSize]}>{endIcon}</span>
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

AGInput.displayName = 'AGInput';

export default AGInput;
