/**
 * AGTabs - Tab Navigation Component
 *
 * Phase 7-C: Global Components
 *
 * Features:
 * - Top/Left tab layouts
 * - Count badges
 * - URL sync support
 * - Icons support
 */

import React, { ReactNode, useState } from 'react';

export interface AGTabItem {
  /** Unique tab key */
  key: string;
  /** Tab label */
  label: string;
  /** Tab icon */
  icon?: ReactNode;
  /** Badge count */
  badge?: number | string;
  /** Badge color */
  badgeColor?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** Disabled state */
  disabled?: boolean;
  /** Tab content */
  content?: ReactNode;
}

export interface AGTabsProps {
  /** Tab items */
  items: AGTabItem[];
  /** Active tab key */
  activeKey?: string;
  /** Default active key */
  defaultActiveKey?: string;
  /** Tab change handler */
  onChange?: (key: string) => void;
  /** Tab position */
  position?: 'top' | 'left';
  /** Tab style variant */
  variant?: 'line' | 'pills' | 'enclosed';
  /** Tab size */
  size?: 'sm' | 'md' | 'lg';
  /** Full width tabs */
  fullWidth?: boolean;
  /** Custom class name */
  className?: string;
  /** Content class name */
  contentClassName?: string;
  /** Render tab content only when active */
  lazyRender?: boolean;
}

const badgeColorClasses = {
  default: 'bg-gray-100 text-gray-600',
  primary: 'bg-blue-100 text-blue-600',
  success: 'bg-green-100 text-green-600',
  warning: 'bg-yellow-100 text-yellow-600',
  danger: 'bg-red-100 text-red-600',
};

export function AGTabs({
  items,
  activeKey,
  defaultActiveKey,
  onChange,
  position = 'top',
  variant = 'line',
  size = 'md',
  fullWidth = false,
  className = '',
  contentClassName = '',
  lazyRender = true,
}: AGTabsProps) {
  const [internalActiveKey, setInternalActiveKey] = useState(
    defaultActiveKey || items[0]?.key
  );

  const currentActiveKey = activeKey ?? internalActiveKey;

  const handleTabClick = (key: string, disabled?: boolean) => {
    if (disabled) return;

    if (onChange) {
      onChange(key);
    } else {
      setInternalActiveKey(key);
    }
  };

  const sizeClasses = {
    sm: 'text-sm py-1.5 px-3',
    md: 'text-sm py-2 px-4',
    lg: 'text-base py-2.5 px-5',
  };

  const getTabClasses = (item: AGTabItem) => {
    const isActive = currentActiveKey === item.key;
    const base = `
      ${sizeClasses[size]}
      font-medium transition-colors
      ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      flex items-center gap-2
      ${fullWidth ? 'flex-1 justify-center' : ''}
    `;

    if (variant === 'line') {
      return `
        ${base}
        ${position === 'top' ? 'border-b-2 -mb-px' : 'border-l-2 -ml-px'}
        ${isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
      `;
    }

    if (variant === 'pills') {
      return `
        ${base}
        rounded-md
        ${isActive
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }
      `;
    }

    if (variant === 'enclosed') {
      return `
        ${base}
        ${position === 'top' ? 'rounded-t-md border border-b-0' : 'rounded-l-md border border-r-0'}
        ${isActive
          ? 'bg-white text-gray-900 border-gray-200'
          : 'bg-gray-50 text-gray-500 border-transparent hover:text-gray-700'
        }
      `;
    }

    return base;
  };

  const renderTabs = () => (
    <div
      className={`
        flex
        ${position === 'top' ? 'flex-row' : 'flex-col'}
        ${position === 'top' && variant === 'line' ? 'border-b border-gray-200' : ''}
        ${position === 'left' && variant === 'line' ? 'border-l border-gray-200' : ''}
        ${variant === 'pills' ? 'gap-1 p-1 bg-gray-100 rounded-lg' : ''}
      `}
      role="tablist"
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={currentActiveKey === item.key}
          aria-controls={`tabpanel-${item.key}`}
          onClick={() => handleTabClick(item.key, item.disabled)}
          className={getTabClasses(item)}
        >
          {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
          <span>{item.label}</span>
          {item.badge !== undefined && (
            <span
              className={`
                ml-1.5 px-1.5 py-0.5 text-xs font-medium rounded-full
                ${badgeColorClasses[item.badgeColor || 'default']}
              `}
            >
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  const renderContent = () => {
    if (lazyRender) {
      const activeItem = items.find((item) => item.key === currentActiveKey);
      return activeItem?.content || null;
    }

    return items.map((item) => (
      <div
        key={item.key}
        id={`tabpanel-${item.key}`}
        role="tabpanel"
        hidden={currentActiveKey !== item.key}
      >
        {item.content}
      </div>
    ));
  };

  if (position === 'left') {
    return (
      <div className={`flex ${className}`}>
        <div className="flex-shrink-0 w-48">{renderTabs()}</div>
        <div className={`flex-1 ${contentClassName}`}>{renderContent()}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      {renderTabs()}
      <div className={`mt-4 ${contentClassName}`}>{renderContent()}</div>
    </div>
  );
}

/**
 * AGTabPanel - Individual tab panel (for manual composition)
 */
export interface AGTabPanelProps {
  /** Tab key (must match AGTabItem key) */
  tabKey: string;
  /** Currently active tab key */
  activeKey: string;
  /** Panel content */
  children: ReactNode;
  /** Custom class name */
  className?: string;
}

export function AGTabPanel({
  tabKey,
  activeKey,
  children,
  className = '',
}: AGTabPanelProps) {
  if (tabKey !== activeKey) return null;

  return (
    <div
      id={`tabpanel-${tabKey}`}
      role="tabpanel"
      className={className}
    >
      {children}
    </div>
  );
}

export default AGTabs;
