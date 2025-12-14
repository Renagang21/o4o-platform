/**
 * AGToolbar - Toolbar Component
 *
 * Phase 7-C: Global Components
 *
 * Features:
 * - Action button groups
 * - Responsive behavior
 * - Search integration
 * - Selection actions
 */

import React, { ReactNode } from 'react';

export interface AGToolbarAction {
  /** Unique key */
  key: string;
  /** Button label */
  label: string;
  /** Button icon */
  icon?: ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Hide on mobile */
  hideOnMobile?: boolean;
  /** Show only when items selected */
  selectionOnly?: boolean;
}

export interface AGToolbarProps {
  /** Left-side actions */
  actions?: AGToolbarAction[];
  /** Right-side actions */
  rightActions?: AGToolbarAction[];
  /** Search element */
  search?: ReactNode;
  /** Filter element */
  filter?: ReactNode;
  /** Number of selected items */
  selectedCount?: number;
  /** Selection label format */
  selectionLabel?: (count: number) => string;
  /** Clear selection handler */
  onClearSelection?: () => void;
  /** Custom class name */
  className?: string;
  /** Sticky toolbar */
  sticky?: boolean;
}

const variantClasses = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
};

function ToolbarButton({
  action,
  size = 'md',
}: {
  action: AGToolbarAction;
  size?: 'sm' | 'md';
}) {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';

  return (
    <button
      key={action.key}
      type="button"
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
      className={`
        ${sizeClasses}
        font-medium rounded-md
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center gap-1.5
        transition-colors
        ${variantClasses[action.variant || 'secondary']}
        ${action.hideOnMobile ? 'hidden sm:flex' : ''}
      `}
    >
      {action.loading ? (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        action.icon && <span className="w-4 h-4">{action.icon}</span>
      )}
      <span className={action.icon && !action.label ? 'sr-only' : ''}>{action.label}</span>
    </button>
  );
}

export function AGToolbar({
  actions = [],
  rightActions = [],
  search,
  filter,
  selectedCount = 0,
  selectionLabel = (count) => `${count}개 선택됨`,
  onClearSelection,
  className = '',
  sticky = false,
}: AGToolbarProps) {
  const hasSelection = selectedCount > 0;

  // Filter actions based on selection
  const visibleActions = actions.filter(
    (a) => !a.selectionOnly || hasSelection
  );
  const visibleRightActions = rightActions.filter(
    (a) => !a.selectionOnly || hasSelection
  );

  return (
    <div
      className={`
        flex flex-col sm:flex-row sm:items-center gap-3
        ${sticky ? 'sticky top-0 bg-white z-10 py-3 -mx-4 px-4 border-b border-gray-200' : ''}
        ${className}
      `}
    >
      {/* Left side */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Selection indicator */}
        {hasSelection && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-blue-600">
              {selectionLabel(selectedCount)}
            </span>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <span className="w-px h-4 bg-gray-300" />
          </div>
        )}

        {/* Actions */}
        {visibleActions.map((action) => (
          <ToolbarButton key={action.key} action={action} />
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        {search}

        {/* Filter */}
        {filter}

        {/* Right actions */}
        {visibleRightActions.map((action) => (
          <ToolbarButton key={action.key} action={action} />
        ))}
      </div>
    </div>
  );
}

/**
 * AGFilterButton - Filter toggle button
 */
export interface AGFilterButtonProps {
  /** Active filter count */
  activeCount?: number;
  /** Click handler */
  onClick: () => void;
  /** Active state */
  isActive?: boolean;
}

export function AGFilterButton({
  activeCount = 0,
  onClick,
  isActive = false,
}: AGFilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-3 py-2 text-sm font-medium rounded-md
        flex items-center gap-1.5
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        transition-colors
        ${isActive || activeCount > 0
          ? 'bg-blue-50 text-blue-700 border border-blue-200'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
      <span>필터</span>
      {activeCount > 0 && (
        <span className="ml-0.5 px-1.5 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">
          {activeCount}
        </span>
      )}
    </button>
  );
}

export default AGToolbar;
