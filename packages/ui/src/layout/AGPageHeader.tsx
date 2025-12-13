/**
 * AGPageHeader - Antigravity Design System Page Header
 *
 * Phase 7-B: Page-level header component
 *
 * Features:
 * - Page title with optional icon
 * - Description text
 * - Breadcrumb integration
 * - Action buttons area
 * - Back button option
 */

import React, { ReactNode } from 'react';

export interface AGPageHeaderProps {
  /** Page title */
  title: string;
  /** Title icon */
  icon?: ReactNode;
  /** Page description */
  description?: string;
  /** Action buttons/elements */
  actions?: ReactNode;
  /** Breadcrumb element */
  breadcrumb?: ReactNode;
  /** Show back button */
  showBack?: boolean;
  /** Back button handler */
  onBack?: () => void;
  /** Back button label */
  backLabel?: string;
  /** Additional content below title */
  children?: ReactNode;
  /** Custom class name */
  className?: string;
}

export function AGPageHeader({
  title,
  icon,
  description,
  actions,
  breadcrumb,
  showBack = false,
  onBack,
  backLabel = '뒤로',
  children,
  className = '',
}: AGPageHeaderProps) {
  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        {/* Breadcrumb */}
        {breadcrumb && <div className="mb-3">{breadcrumb}</div>}

        {/* Back button */}
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 mb-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>{backLabel}</span>
          </button>
        )}

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Icon */}
            {icon && (
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                {icon}
              </div>
            )}

            <div>
              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {title}
              </h1>

              {/* Description */}
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {actions}
            </div>
          )}
        </div>

        {/* Additional content */}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}

export default AGPageHeader;
