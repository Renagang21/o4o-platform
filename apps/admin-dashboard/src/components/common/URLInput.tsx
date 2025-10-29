/**
 * URLInput Component
 *
 * Common URL input component that supports both absolute and relative URLs.
 * Used across all blocks (Link, Image, Button, Header, etc.)
 *
 * Features:
 * - Supports absolute URLs (https://example.com)
 * - Supports relative URLs (/path/to/page)
 * - Visual feedback for URL type
 * - Optional URL validation
 */

import React, { forwardRef } from 'react';
import { Link2, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface URLInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showIcon?: boolean;
  iconPosition?: 'left' | 'right';
  helperText?: string;
  error?: string;
  variant?: 'default' | 'inline' | 'compact';
}

/**
 * URLInput - Common component for URL input across all blocks
 *
 * @example
 * // Basic usage
 * <URLInput
 *   value={url}
 *   onChange={(e) => setUrl(e.target.value)}
 *   placeholder="Enter URL or /path"
 * />
 *
 * @example
 * // With icon and helper text
 * <URLInput
 *   value={url}
 *   onChange={(e) => setUrl(e.target.value)}
 *   showIcon
 *   helperText="Supports absolute (https://...) and relative (/path) URLs"
 * />
 */
export const URLInput = forwardRef<HTMLInputElement, URLInputProps>(
  (
    {
      value,
      onChange,
      placeholder = 'Enter URL or /path for relative links',
      showIcon = true,
      iconPosition = 'left',
      helperText,
      error,
      variant = 'default',
      className,
      ...props
    },
    ref
  ) => {
    // Detect URL type for visual feedback
    const isRelativeURL = value.startsWith('/') && !value.startsWith('//');
    const isAbsoluteURL = /^https?:\/\//i.test(value);
    const isEmpty = !value || value.trim() === '';

    // Determine which icon to show
    const Icon = isRelativeURL ? Home : Link2;

    // Variant styles
    const variantStyles = {
      default: 'px-3 py-2 text-sm',
      inline: 'px-2 py-1 text-sm',
      compact: 'px-2 py-1 text-xs',
    };

    const inputClasses = cn(
      'w-full border rounded transition-colors',
      'focus:outline-none focus:ring-2',
      error
        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200',
      showIcon && iconPosition === 'left' && 'pl-8',
      showIcon && iconPosition === 'right' && 'pr-8',
      variantStyles[variant],
      className
    );

    const iconClasses = cn(
      'absolute top-1/2 -translate-y-1/2 transition-colors',
      iconPosition === 'left' ? 'left-2' : 'right-2',
      error
        ? 'text-red-400'
        : isRelativeURL
        ? 'text-blue-500'
        : isAbsoluteURL
        ? 'text-green-500'
        : 'text-gray-400'
    );

    const iconSize = variant === 'compact' ? 'w-3 h-3' : 'w-4 h-4';

    return (
      <div className="w-full">
        <div className="relative">
          {showIcon && (
            <Icon className={cn(iconClasses, iconSize)} />
          )}
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={inputClasses}
            {...props}
          />
        </div>

        {/* Helper text or error message */}
        {(helperText || error) && (
          <p
            className={cn(
              'mt-1 text-xs',
              error ? 'text-red-600' : 'text-gray-500'
            )}
          >
            {error || helperText}
          </p>
        )}

        {/* URL type indicator (for debugging/development) */}
        {!isEmpty && !error && import.meta.env.DEV && (
          <p className="mt-1 text-xs text-gray-400">
            {isRelativeURL && '📍 Relative URL (same site)'}
            {isAbsoluteURL && '🌐 Absolute URL (external)'}
          </p>
        )}
      </div>
    );
  }
);

URLInput.displayName = 'URLInput';

/**
 * Utility function to validate URLs
 * Accepts both absolute and relative URLs
 */
export const validateURL = (url: string): { isValid: boolean; error?: string } => {
  if (!url || url.trim() === '') {
    return { isValid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();

  // Allow relative URLs starting with /
  if (trimmedUrl.startsWith('/')) {
    // Check for valid path format
    if (trimmedUrl.length === 1 || /^\/[a-zA-Z0-9\-_~:/?#[\]@!$&'()*+,;=.%]+$/.test(trimmedUrl)) {
      return { isValid: true };
    }
    return { isValid: false, error: 'Invalid path format' };
  }

  // Check for absolute URL
  if (/^https?:\/\//i.test(trimmedUrl)) {
    try {
      new URL(trimmedUrl);
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }

  // If it doesn't start with / or http(s)://, it's invalid
  return {
    isValid: false,
    error: 'URL must be absolute (https://...) or relative (/path)',
  };
};

/**
 * Utility function to normalize URL for display
 * Ensures URL is properly formatted for href attribute
 */
export const normalizeURL = (url: string): string => {
  if (!url) return '';

  const trimmed = url.trim();

  // Relative URLs are already normalized
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // Return absolute URLs as-is
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // If user forgot protocol, add https://
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed}`;
  }

  return trimmed;
};
