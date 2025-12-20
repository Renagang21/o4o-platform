/**
 * Layout Types - O4O Global Layout System
 *
 * Phase 7-B: Navigation and layout type definitions
 */

import { ReactNode } from 'react';

/**
 * Navigation item structure
 */
export interface NavItem {
  /** Display label */
  label: string;
  /** Route path */
  path: string;
  /** Icon element (optional) */
  icon?: ReactNode;
  /** Badge text or count (optional) */
  badge?: string | number;
  /** Badge color variant */
  badgeColor?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Nested children items */
  children?: NavItem[];
  /** External link flag */
  external?: boolean;
  /** Permissions required to view this item */
  permissions?: string[];
}

/**
 * Navigation group (for sidebar sections)
 */
export interface NavGroup {
  /** Group title */
  title: string;
  /** Items in this group */
  items: NavItem[];
  /** Whether the group is collapsible */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

/**
 * User info for header
 */
export interface LayoutUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  /** Route path (preferred) */
  path?: string;
  /** Route path (alias for path) */
  href?: string;
  icon?: ReactNode;
  /** Whether this is the current page (non-clickable) */
  current?: boolean;
}

/**
 * App layout configuration
 */
export interface AppLayoutConfig {
  /** Application/service name */
  appName: string;
  /** Logo element or URL */
  logo?: ReactNode | string;
  /** Navigation items/groups */
  navigation: NavItem[] | NavGroup[];
  /** Show header */
  showHeader?: boolean;
  /** Show sidebar */
  showSidebar?: boolean;
  /** Sidebar default collapsed state */
  sidebarCollapsed?: boolean;
  /** Fixed header */
  fixedHeader?: boolean;
  /** Fixed sidebar */
  fixedSidebar?: boolean;
}

/**
 * Context switcher option
 */
export interface ContextOption {
  id: string;
  label: string;
  icon?: ReactNode;
  path: string;
}
