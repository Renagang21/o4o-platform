/**
 * AGSelect - Antigravity Design System Select
 *
 * Phase 7-A: Core select component
 *
 * Features:
 * - Label support
 * - Error state with message
 * - Helper text
 * - Disabled state
 * - Multiple sizes
 * - Searchable option (Phase 7-B)
 * - Multi-select option (Phase 7-B)
 */

import React, { forwardRef, SelectHTMLAttributes, ReactNode } from 'react';

export type AGSelectSize = 'sm' | 'md' | 'lg';

export interface AGSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface AGSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  selectSize?: AGSelectSize;
  placeholder?: string;
  options?: AGSelectOption[];
  fullWidth?: boolean;
}

const sizeStyles: Record<AGSelectSize, string> = {
  sm: 'h-8 text-sm px-2.5 pr-8',
  md: 'h-10 text-sm px-3 pr-10',
  lg: 'h-12 text-base px-4 pr-12',
};

export const AGSelect = forwardRef<HTMLSelectElement, AGSelectProps>(
  (
    {
      label,
      error,
      helperText,
      selectSize = 'md',
      placeholder,
      options = [],
      fullWidth = false,
      className = '',
      disabled,
      id,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || `ag-select-${Math.random().toString(36).slice(2, 9)}`;
    const hasError = !!error;

    const baseSelectStyles = `
      w-full rounded-md border bg-white
      appearance-none cursor-pointer
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500
    `;

    const stateStyles = hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200';

    const selectClasses = [
      baseSelectStyles,
      stateStyles,
      sizeStyles[selectSize],
      className,
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return (
      <div className={fullWidth ? 'w-full' : 'inline-block'}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={selectClasses}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
            {children}
          </select>
          {/* Dropdown Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {error && (
          <p id={`${selectId}-error`} className="mt-1.5 text-sm text-red-600">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${selectId}-helper`} className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

AGSelect.displayName = 'AGSelect';

export default AGSelect;
