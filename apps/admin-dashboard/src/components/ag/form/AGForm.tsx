/**
 * AGForm - Form Container Component
 *
 * Phase 7-C: Global Components
 *
 * Features:
 * - Form wrapper with consistent styling
 * - Sections support
 * - Loading overlay
 * - Card wrapper option
 */

import React, { ReactNode, FormHTMLAttributes } from 'react';

export interface AGFormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'title'> {
  /** Form title */
  title?: string;
  /** Form description */
  description?: string;
  /** Loading state (shows overlay) */
  loading?: boolean;
  /** Wrap in card */
  card?: boolean;
  /** Form children */
  children: ReactNode;
}

export function AGForm({
  title,
  description,
  loading = false,
  card = true,
  children,
  className = '',
  ...props
}: AGFormProps) {
  const content = (
    <>
      {/* Title/Description */}
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}

      {/* Form content */}
      {children}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-3">
            <svg
              className="animate-spin h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm text-gray-600">처리 중...</span>
          </div>
        </div>
      )}
    </>
  );

  if (card) {
    return (
      <form
        className={`relative bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}
        {...props}
      >
        {content}
      </form>
    );
  }

  return (
    <form className={`relative ${className}`} {...props}>
      {content}
    </form>
  );
}

/**
 * AGFormSection - Form Section Component
 */
export interface AGFormSectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Section children */
  children: ReactNode;
  /** Custom class name */
  className?: string;
  /** Divider above */
  divider?: boolean;
}

export function AGFormSection({
  title,
  description,
  children,
  className = '',
  divider = false,
}: AGFormSectionProps) {
  return (
    <div className={`${divider ? 'pt-6 mt-6 border-t border-gray-200' : ''} ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h4 className="text-sm font-medium text-gray-900">{title}</h4>
          )}
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * AGFormGrid - Form Grid Layout Component
 */
export interface AGFormGridProps {
  /** Number of columns */
  cols?: 1 | 2 | 3 | 4;
  /** Gap size */
  gap?: 'sm' | 'md' | 'lg';
  /** Children */
  children: ReactNode;
  /** Custom class name */
  className?: string;
}

export function AGFormGrid({
  cols = 2,
  gap = 'md',
  children,
  className = '',
}: AGFormGridProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={`grid ${colClasses[cols]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

export default AGForm;
