/**
 * AGSearchBar - Search Bar Component
 *
 * Phase 7-C: Global Components
 *
 * Features:
 * - Search input with icon
 * - Debounce support
 * - Clear button
 * - Filter panel integration
 */

import React, { useState, useEffect, useRef, ReactNode } from 'react';

export interface AGSearchBarProps {
  /** Search value */
  value?: string;
  /** Default value */
  defaultValue?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Search handler (on enter or debounce) */
  onSearch?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in ms (0 to disable) */
  debounce?: number;
  /** Show clear button */
  showClear?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Full width */
  fullWidth?: boolean;
  /** Custom class name */
  className?: string;
  /** Filter button/panel */
  filterElement?: ReactNode;
  /** Auto focus */
  autoFocus?: boolean;
}

export function AGSearchBar({
  value,
  defaultValue = '',
  onChange,
  onSearch,
  placeholder = '검색...',
  debounce = 300,
  showClear = true,
  loading = false,
  disabled = false,
  size = 'md',
  fullWidth = false,
  className = '',
  filterElement,
  autoFocus = false,
}: AGSearchBarProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentValue = value ?? internalValue;

  // Handle debounced search
  useEffect(() => {
    if (debounce > 0 && onSearch) {
      debounceRef.current = setTimeout(() => {
        onSearch(currentValue);
      }, debounce);

      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }
  }, [currentValue, debounce, onSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch) {
      // Clear any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      onSearch(currentValue);
    }
  };

  const handleClear = () => {
    if (onChange) {
      onChange('');
    } else {
      setInternalValue('');
    }
    onSearch?.('');
    inputRef.current?.focus();
  };

  const sizeClasses = {
    sm: 'h-8 text-sm pl-8 pr-8',
    md: 'h-10 text-sm pl-10 pr-10',
    lg: 'h-12 text-base pl-12 pr-12',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const iconPositionClasses = {
    sm: 'left-2',
    md: 'left-3',
    lg: 'left-3.5',
  };

  const clearPositionClasses = {
    sm: 'right-2',
    md: 'right-3',
    lg: 'right-3.5',
  };

  return (
    <div className={`flex items-center gap-2 ${fullWidth ? 'w-full' : ''} ${className}`}>
      <div className={`relative ${fullWidth ? 'flex-1' : 'w-64'}`}>
        {/* Search icon */}
        <div className={`absolute inset-y-0 ${iconPositionClasses[size]} flex items-center pointer-events-none`}>
          {loading ? (
            <svg
              className={`${iconSizeClasses[size]} text-gray-400 animate-spin`}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg
              className={`${iconSizeClasses[size]} text-gray-400`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={currentValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`
            w-full ${sizeClasses[size]}
            border border-gray-300 rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            placeholder-gray-400
          `}
        />

        {/* Clear button */}
        {showClear && currentValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className={`
              absolute inset-y-0 ${clearPositionClasses[size]}
              flex items-center text-gray-400 hover:text-gray-600
            `}
          >
            <svg className={iconSizeClasses[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter element */}
      {filterElement}
    </div>
  );
}

export default AGSearchBar;
