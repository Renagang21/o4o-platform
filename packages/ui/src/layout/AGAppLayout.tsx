/**
 * AGAppLayout - Antigravity Design System App Layout
 *
 * Phase 7-B: Main application layout wrapper
 *
 * Features:
 * - Composes Header + Sidebar + Content
 * - Manages mobile menu state
 * - Handles sidebar collapse state
 * - Responsive layout switching
 */

import React, { useState, ReactNode } from 'react';
import { AGHeader, AGHeaderProps } from './AGHeader';
import { AGSidebar, AGSidebarProps } from './AGSidebar';
import { NavItem, NavGroup, LayoutUser, ContextOption } from './types';

export interface AGAppLayoutProps {
  /** Application title */
  title: string;
  /** Logo element or URL */
  logo?: ReactNode | string;
  /** Navigation items */
  navigation: (NavItem | NavGroup)[];
  /** Current active path */
  currentPath?: string;
  /** Navigation handler */
  onNavigate?: (path: string) => void;
  /** Current user */
  user?: LayoutUser | null;
  /** User menu handlers */
  onLogout?: () => void;
  onProfile?: () => void;
  /** Context options (for multi-org/store) */
  contextOptions?: ContextOption[];
  currentContext?: string;
  onContextChange?: (contextId: string) => void;
  /** Header actions */
  headerActions?: ReactNode;
  /** Sidebar header content */
  sidebarHeader?: ReactNode;
  /** Sidebar footer content */
  sidebarFooter?: ReactNode;
  /** Enable sidebar collapse */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Main content */
  children: ReactNode;
  /** Custom class name for content area */
  contentClassName?: string;
}

export function AGAppLayout({
  title,
  logo,
  navigation,
  currentPath,
  onNavigate,
  user,
  onLogout,
  onProfile,
  contextOptions,
  currentContext,
  onContextChange,
  headerActions,
  sidebarHeader,
  sidebarFooter,
  collapsible = true,
  defaultCollapsed = false,
  children,
  contentClassName = '',
}: AGAppLayoutProps) {
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Desktop sidebar collapsed state
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileClose = () => {
    setIsMobileMenuOpen(false);
  };

  const handleNavigate = (path: string) => {
    onNavigate?.(path);
    // Close mobile menu on navigation
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <AGHeader
        title={title}
        logo={logo}
        user={user}
        contextOptions={contextOptions}
        currentContext={currentContext}
        onContextChange={onContextChange}
        onLogout={onLogout}
        onProfile={onProfile}
        onMenuToggle={handleMenuToggle}
        showMenuButton={true}
        actions={headerActions}
        className="fixed top-0 left-0 right-0 z-30"
      />

      {/* Main layout container */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <AGSidebar
          navigation={navigation}
          currentPath={currentPath}
          onNavigate={handleNavigate}
          isOpen={isMobileMenuOpen}
          onClose={handleMobileClose}
          header={sidebarHeader}
          footer={sidebarFooter}
          collapsed={isCollapsed}
          onCollapsedChange={collapsible ? setIsCollapsed : undefined}
          className="fixed top-16 bottom-0 left-0 z-20"
        />

        {/* Main content area */}
        <main
          className={`
            flex-1 min-w-0
            transition-all duration-300 ease-in-out
            ${isCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
            ${contentClassName}
          `}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default AGAppLayout;
