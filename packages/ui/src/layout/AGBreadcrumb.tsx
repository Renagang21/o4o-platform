/**
 * AGBreadcrumb - Antigravity Design System Breadcrumb
 *
 * Phase 7-B: Navigation breadcrumb component
 *
 * Features:
 * - Home icon option
 * - Clickable path items
 * - Current page (non-clickable)
 * - Custom separator
 * - Truncation for long paths
 */

import React, { ReactNode } from 'react';
import { BreadcrumbItem } from './types';

export interface AGBreadcrumbProps {
  /** Breadcrumb items */
  items: BreadcrumbItem[];
  /** Navigation handler */
  onNavigate?: (path: string) => void;
  /** Show home icon as first item */
  showHome?: boolean;
  /** Home path */
  homePath?: string;
  /** Custom separator */
  separator?: ReactNode;
  /** Max items to show (rest collapsed) */
  maxItems?: number;
  /** Custom class name */
  className?: string;
}

/** Default chevron separator */
function DefaultSeparator() {
  return (
    <svg
      className="w-4 h-4 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

/** Home icon */
function HomeIcon() {
  return (
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
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

export function AGBreadcrumb({
  items,
  onNavigate,
  showHome = true,
  homePath = '/',
  separator,
  maxItems,
  className = '',
}: AGBreadcrumbProps) {
  // Process items for truncation
  let displayItems = items;
  let hasEllipsis = false;

  if (maxItems && items.length > maxItems) {
    // Keep first and last items, collapse middle
    const firstItem = items[0];
    const lastItems = items.slice(-(maxItems - 1));
    displayItems = [firstItem, ...lastItems];
    hasEllipsis = true;
  }

  const handleClick = (item: BreadcrumbItem) => {
    if (item.path && !item.current) {
      onNavigate?.(item.path);
    }
  };

  const handleHomeClick = () => {
    onNavigate?.(homePath);
  };

  const Separator = separator ? () => <>{separator}</> : DefaultSeparator;

  return (
    <nav className={`flex items-center ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {/* Home icon */}
        {showHome && (
          <li className="flex items-center">
            <button
              type="button"
              onClick={handleHomeClick}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Home"
            >
              <HomeIcon />
            </button>
          </li>
        )}

        {/* Separator after home */}
        {showHome && displayItems.length > 0 && (
          <li className="flex items-center">
            <Separator />
          </li>
        )}

        {/* Ellipsis for collapsed items */}
        {hasEllipsis && (
          <>
            {/* First item */}
            <li className="flex items-center">
              <button
                type="button"
                onClick={() => handleClick(displayItems[0])}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {displayItems[0].icon && (
                  <span className="mr-1.5">{displayItems[0].icon}</span>
                )}
                {displayItems[0].label}
              </button>
            </li>
            <li className="flex items-center">
              <Separator />
            </li>
            <li className="flex items-center">
              <span className="text-sm text-gray-400">...</span>
            </li>
            <li className="flex items-center">
              <Separator />
            </li>
            {/* Remaining items */}
            {displayItems.slice(1).map((item, index) => (
              <li key={item.path || index} className="flex items-center">
                {index > 0 && (
                  <span className="mr-2">
                    <Separator />
                  </span>
                )}
                {item.current ? (
                  <span
                    className="text-sm font-medium text-gray-900"
                    aria-current="page"
                  >
                    {item.icon && <span className="mr-1.5">{item.icon}</span>}
                    {item.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleClick(item)}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {item.icon && <span className="mr-1.5">{item.icon}</span>}
                    {item.label}
                  </button>
                )}
              </li>
            ))}
          </>
        )}

        {/* Normal rendering without ellipsis */}
        {!hasEllipsis &&
          displayItems.map((item, index) => (
            <li key={item.path || index} className="flex items-center">
              {index > 0 && (
                <span className="mr-2">
                  <Separator />
                </span>
              )}
              {item.current ? (
                <span
                  className="text-sm font-medium text-gray-900"
                  aria-current="page"
                >
                  {item.icon && <span className="mr-1.5">{item.icon}</span>}
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleClick(item)}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {item.icon && <span className="mr-1.5">{item.icon}</span>}
                  {item.label}
                </button>
              )}
            </li>
          ))}
      </ol>
    </nav>
  );
}

export default AGBreadcrumb;
