/**
 * AGFormField - Form Field Component
 *
 * Phase 7-C: Global Components
 *
 * Features:
 * - React Hook Form integration
 * - Multiple input types
 * - Validation error display
 * - Label and helper text
 */

import React, { ReactNode } from 'react';
import {
  UseFormRegister,
  FieldError,
  FieldValues,
  Path,
  RegisterOptions,
} from 'react-hook-form';

export type AGFormFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'datetime-local'
  | 'time';

export interface AGFormFieldOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface AGFormFieldProps<T extends FieldValues> {
  /** Field name (must match form schema) */
  name: Path<T>;
  /** Field label */
  label?: string;
  /** Field type */
  type?: AGFormFieldType;
  /** Placeholder text */
  placeholder?: string;
  /** Helper text */
  helperText?: string;
  /** Required field */
  required?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Register function from useForm */
  register: UseFormRegister<T>;
  /** Validation rules */
  rules?: RegisterOptions<T, Path<T>>;
  /** Field error */
  error?: FieldError;
  /** Options for select/radio */
  options?: AGFormFieldOption[];
  /** Textarea rows */
  rows?: number;
  /** Custom class name */
  className?: string;
  /** Input prefix */
  prefix?: ReactNode;
  /** Input suffix */
  suffix?: ReactNode;
  /** Auto focus */
  autoFocus?: boolean;
  /** Min value for number */
  min?: number;
  /** Max value for number */
  max?: number;
  /** Step for number */
  step?: number;
}

export function AGFormField<T extends FieldValues>({
  name,
  label,
  type = 'text',
  placeholder,
  helperText,
  required = false,
  disabled = false,
  readOnly = false,
  register,
  rules,
  error,
  options = [],
  rows = 3,
  className = '',
  prefix,
  suffix,
  autoFocus,
  min,
  max,
  step,
}: AGFormFieldProps<T>) {
  const inputId = `field-${String(name)}`;
  const hasError = !!error;

  const baseInputClasses = `
    block w-full rounded-md border-gray-300 shadow-sm
    focus:border-blue-500 focus:ring-blue-500 sm:text-sm
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
  `;

  const renderInput = () => {
    // Checkbox
    if (type === 'checkbox') {
      return (
        <div className="flex items-center">
          <input
            id={inputId}
            type="checkbox"
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
            {...register(name, rules)}
          />
          {label && (
            <label htmlFor={inputId} className="ml-2 text-sm text-gray-700">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
        </div>
      );
    }

    // Radio group
    if (type === 'radio') {
      return (
        <div className="space-y-2">
          {options.map((option) => (
            <div key={option.value} className="flex items-center">
              <input
                id={`${inputId}-${option.value}`}
                type="radio"
                value={option.value}
                disabled={disabled || option.disabled}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                {...register(name, rules)}
              />
              <label
                htmlFor={`${inputId}-${option.value}`}
                className="ml-2 text-sm text-gray-700"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      );
    }

    // Select
    if (type === 'select') {
      return (
        <select
          id={inputId}
          disabled={disabled}
          className={baseInputClasses}
          {...register(name, rules)}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
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
        </select>
      );
    }

    // Textarea
    if (type === 'textarea') {
      return (
        <textarea
          id={inputId}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          className={baseInputClasses}
          {...register(name, rules)}
        />
      );
    }

    // Standard inputs
    const inputElement = (
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        min={min}
        max={max}
        step={step}
        className={`${baseInputClasses} ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-10' : ''}`}
        {...register(name, rules)}
      />
    );

    // With prefix/suffix
    if (prefix || suffix) {
      return (
        <div className="relative">
          {prefix && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {prefix}
            </div>
          )}
          {inputElement}
          {suffix && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              {suffix}
            </div>
          )}
        </div>
      );
    }

    return inputElement;
  };

  // Checkbox has inline label
  if (type === 'checkbox') {
    return (
      <div className={`${className}`}>
        {renderInput()}
        {helperText && !hasError && (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        )}
        {hasError && (
          <p className="mt-1 text-xs text-red-600">{error.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Label */}
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input */}
      {renderInput()}

      {/* Helper/Error text */}
      {helperText && !hasError && (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      )}
      {hasError && (
        <p className="mt-1 text-xs text-red-600">{error.message}</p>
      )}
    </div>
  );
}

export default AGFormField;
