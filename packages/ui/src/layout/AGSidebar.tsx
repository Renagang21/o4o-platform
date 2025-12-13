/**
 * AGSidebar - Antigravity Design System Sidebar
 *
 * Phase 7-B: Global sidebar component
 *
 * Features:
 * - Hierarchical menu structure (group/sub-items)
 * - Active path highlighting
 * - Collapsible groups
 * - Badge support
 * - Mobile responsive (overlay mode)
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { NavItem, NavGroup } from './types';

export interface AGSidebarProps {
  /** Navigation items or groups */
  navigation: (NavItem | NavGroup)[];
  /** Current active path */
  currentPath?: string;
  /** Navigation handler */
  onNavigate?: (path: string) => void;
  /** Whether sidebar is open (mobile) */
  isOpen?: boolean;
  /** Close handler (mobile) */
  onClose?: () => void;
  /** Header content (logo, title) */
  header?: ReactNode;
  /** Footer content */
  footer?: ReactNode;
  /** Collapsed state (desktop) */
  collapsed?: boolean;
  /** Toggle collapsed state */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Custom class name */
  className?: string;
}

/** Type guard to check if item is a NavGroup */
function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return 'title' in item && 'items' in item && !('path' in item);
}

/** Badge component */
function SidebarBadge({
  value,
  color = 'default',
}: {
  value: string | number;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}) {
  const colorStyles = {
    default: 'bg-gray-100 text-gray-600',
    primary: 'bg-blue-100 text-blue-600',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    danger: 'bg-red-100 text-red-600',
  };

  return (
    <span
      className={`
        ml-auto px-2 py-0.5 text-xs font-medium rounded-full
        ${colorStyles[color]}
      `}
    >
      {value}
    </span>
  );
}

/** Single nav item component */
function SidebarNavItem({
  item,
  currentPath,
  onNavigate,
  depth = 0,
  collapsed = false,
}: {
  item: NavItem;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  depth?: number;
  collapsed?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = currentPath === item.path;
  const isChildActive = item.children?.some(
    (child) =>
      currentPath === child.path ||
      child.children?.some((sub) => currentPath === sub.path)
  );

  // Auto-expand if child is active
  useEffect(() => {
    if (isChildActive) {
      setIsExpanded(true);
    }
  }, [isChildActive]);

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else if (!item.disabled && !item.external) {
      onNavigate?.(item.path);
    }
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    if (item.external) {
      e.preventDefault();
      window.open(item.path, '_blank', 'noopener,noreferrer');
    }
  };

  const paddingLeft = collapsed ? 'pl-3' : `pl-${3 + depth * 3}`;

  return (
    <li>
      <button
        type="button"
        onClick={(e) => {
          handleClick();
          if (item.external) handleExternalClick(e);
        }}
        disabled={item.disabled}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg
          transition-colors duration-150
          ${paddingLeft}
          ${
            isActive
              ? 'bg-blue-50 text-blue-700'
              : isChildActive
              ? 'text-gray-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }
          ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={collapsed ? item.label : undefined}
      >
        {/* Icon */}
        {item.icon && (
          <span
            className={`
              flex-shrink-0 w-5 h-5
              ${isActive ? 'text-blue-600' : 'text-gray-400'}
            `}
          >
            {item.icon}
          </span>
        )}

        {/* Label */}
        {!collapsed && <span className="flex-1 text-left">{item.label}</span>}

        {/* External indicator */}
        {!collapsed && item.external && (
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
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        )}

        {/* Badge */}
        {!collapsed && item.badge !== undefined && (
          <SidebarBadge value={item.badge} color={item.badgeColor} />
        )}

        {/* Expand/collapse arrow */}
        {!collapsed && hasChildren && (
          <svg
            className={`
              w-4 h-4 text-gray-400 transition-transform duration-200
              ${isExpanded ? 'rotate-90' : ''}
            `}
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
        )}
      </button>

      {/* Children */}
      {hasChildren && isExpanded && !collapsed && (
        <ul className="mt-1 space-y-1">
          {item.children!.map((child, index) => (
            <SidebarNavItem
              key={child.path || index}
              item={child}
              currentPath={currentPath}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Nav group component */
function SidebarNavGroup({
  group,
  currentPath,
  onNavigate,
  collapsed = false,
}: {
  group: NavGroup;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  collapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(group.defaultCollapsed ?? false);

  if (collapsed) {
    // In collapsed sidebar, just render items without group title
    return (
      <ul className="space-y-1">
        {group.items.map((item, index) => (
          <SidebarNavItem
            key={item.path || index}
            item={item}
            currentPath={currentPath}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-1">
      {/* Group title */}
      {group.collapsible ? (
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600"
        >
          <span>{group.title}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
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
        </button>
      ) : (
        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {group.title}
        </div>
      )}

      {/* Group items */}
      {!isCollapsed && (
        <ul className="space-y-1">
          {group.items.map((item, index) => (
            <SidebarNavItem
              key={item.path || index}
              item={item}
              currentPath={currentPath}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export function AGSidebar({
  navigation,
  currentPath,
  onNavigate,
  isOpen = false,
  onClose,
  header,
  footer,
  collapsed = false,
  onCollapsedChange,
  className = '',
}: AGSidebarProps) {
  // Render navigation items
  const renderNavigation = () => (
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
      {navigation.map((item, index) => {
        if (isNavGroup(item)) {
          return (
            <SidebarNavGroup
              key={item.title || index}
              group={item}
              currentPath={currentPath}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          );
        }
        return (
          <ul key={item.path || index} className="space-y-1">
            <SidebarNavItem
              item={item}
              currentPath={currentPath}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          </ul>
        );
      })}
    </nav>
  );

  // Desktop sidebar
  const desktopSidebar = (
    <aside
      className={`
        hidden lg:flex flex-col
        ${collapsed ? 'w-16' : 'w-64'}
        bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out
        ${className}
      `}
    >
      {/* Header */}
      {header && (
        <div className={`flex-shrink-0 ${collapsed ? 'p-2' : 'p-4'} border-b border-gray-200`}>
          {header}
        </div>
      )}

      {/* Navigation */}
      {renderNavigation()}

      {/* Collapse toggle */}
      {onCollapsedChange && (
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="flex-shrink-0 p-3 border-t border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-5 h-5 mx-auto transition-transform ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Footer */}
      {footer && !collapsed && (
        <div className="flex-shrink-0 p-4 border-t border-gray-200">{footer}</div>
      )}
    </aside>
  );

  // Mobile sidebar (overlay)
  const mobileSidebar = (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64
          bg-white shadow-xl
          transform transition-transform duration-300 ease-in-out
          lg:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"
          aria-label="Close menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        {header && (
          <div className="p-4 border-b border-gray-200">{header}</div>
        )}

        {/* Navigation */}
        {renderNavigation()}

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 p-4 border-t border-gray-200">{footer}</div>
        )}
      </aside>
    </>
  );

  return (
    <>
      {desktopSidebar}
      {mobileSidebar}
    </>
  );
}

export default AGSidebar;
