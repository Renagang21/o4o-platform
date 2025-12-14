/**
 * AGFormActions - Form Action Buttons Component
 *
 * Phase 7-C: Global Components
 *
 * Features:
 * - Submit/Cancel buttons
 * - Loading state
 * - Alignment options
 * - Custom actions support
 */

import React, { ReactNode } from 'react';

export interface AGFormActionsProps {
  /** Submit button text */
  submitLabel?: string;
  /** Cancel button text */
  cancelLabel?: string;
  /** Submit handler (if not using form submission) */
  onSubmit?: () => void;
  /** Cancel handler */
  onCancel?: () => void;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Show cancel button */
  showCancel?: boolean;
  /** Alignment */
  align?: 'left' | 'center' | 'right' | 'between';
  /** Additional actions (left side) */
  leftActions?: ReactNode;
  /** Additional actions (right side) */
  rightActions?: ReactNode;
  /** Custom class name */
  className?: string;
  /** Sticky footer */
  sticky?: boolean;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
}

export function AGFormActions({
  submitLabel = '저장',
  cancelLabel = '취소',
  onSubmit,
  onCancel,
  loading = false,
  disabled = false,
  showCancel = true,
  align = 'right',
  leftActions,
  rightActions,
  className = '',
  sticky = false,
  size = 'md',
}: AGFormActionsProps) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const containerClasses = `
    flex items-center gap-3 ${alignClasses[align]}
    ${sticky ? 'sticky bottom-0 bg-white py-4 border-t border-gray-200 -mx-6 px-6 mt-6' : 'mt-6'}
    ${className}
  `;

  return (
    <div className={containerClasses}>
      {/* Left actions */}
      {leftActions && (
        <div className="flex items-center gap-2">
          {leftActions}
        </div>
      )}

      {/* Spacer for between alignment */}
      {align === 'between' && <div className="flex-1" />}

      {/* Main actions */}
      <div className="flex items-center gap-3">
        {/* Cancel button */}
        {showCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`
              ${sizeClasses[size]}
              font-medium rounded-md
              text-gray-700 bg-white border border-gray-300
              hover:bg-gray-50
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
          >
            {cancelLabel}
          </button>
        )}

        {/* Submit button */}
        <button
          type={onSubmit ? 'button' : 'submit'}
          onClick={onSubmit}
          disabled={loading || disabled}
          className={`
            ${sizeClasses[size]}
            font-medium rounded-md
            text-white bg-blue-600
            hover:bg-blue-700
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            flex items-center gap-2
          `}
        >
          {loading && (
            <svg
              className="animate-spin h-4 w-4"
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
          )}
          {submitLabel}
        </button>

        {/* Right actions */}
        {rightActions}
      </div>
    </div>
  );
}

export default AGFormActions;
