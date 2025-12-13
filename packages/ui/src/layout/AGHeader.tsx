/**
 * AGHeader - Antigravity Design System Header
 *
 * Phase 7-B: Global header component
 *
 * Features:
 * - Logo/service name on left
 * - Context switcher (optional)
 * - User menu on right
 * - Mobile menu toggle
 */

import React, { useState, ReactNode } from 'react';
import { LayoutUser, ContextOption } from './types';

export interface AGHeaderProps {
  /** Application/service title */
  title: string;
  /** Logo element or URL */
  logo?: ReactNode | string;
  /** Current user info */
  user?: LayoutUser | null;
  /** Context options for switcher */
  contextOptions?: ContextOption[];
  /** Current context ID */
  currentContext?: string;
  /** Context change handler */
  onContextChange?: (contextId: string) => void;
  /** User menu actions */
  onLogout?: () => void;
  onProfile?: () => void;
  /** Mobile menu toggle */
  onMenuToggle?: () => void;
  /** Show mobile menu button */
  showMenuButton?: boolean;
  /** Additional actions in header */
  actions?: ReactNode;
  /** Custom class name */
  className?: string;
}

export function AGHeader({
  title,
  logo,
  user,
  contextOptions,
  currentContext,
  onContextChange,
  onLogout,
  onProfile,
  onMenuToggle,
  showMenuButton = true,
  actions,
  className = '',
}: AGHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);

  const currentContextLabel = contextOptions?.find(c => c.id === currentContext)?.label;

  return (
    <header
      className={`
        h-16 bg-white border-b border-gray-200
        flex items-center justify-between px-4
        ${className}
      `}
    >
      {/* Left Section: Menu Button + Logo + Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Toggle */}
        {showMenuButton && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Logo */}
        {logo && (
          <div className="flex-shrink-0">
            {typeof logo === 'string' ? (
              <img src={logo} alt={title} className="h-8 w-auto" />
            ) : (
              logo
            )}
          </div>
        )}

        {/* Title */}
        <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">
          {title}
        </h1>
      </div>

      {/* Center Section: Context Switcher */}
      {contextOptions && contextOptions.length > 1 && (
        <div className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setShowContextMenu(!showContextMenu)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <span>{currentContextLabel || 'Select'}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Context Dropdown */}
          {showContextMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowContextMenu(false)}
              />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                {contextOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onContextChange?.(option.id);
                      setShowContextMenu(false);
                    }}
                    className={`
                      w-full flex items-center gap-2 px-4 py-2 text-sm text-left
                      ${currentContext === option.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}
                    `}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Right Section: Actions + User Menu */}
      <div className="flex items-center gap-3">
        {/* Custom Actions */}
        {actions}

        {/* User Menu */}
        {user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-full"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="hidden sm:block text-sm text-gray-700">{user.name}</span>
              <svg className="w-4 h-4 text-gray-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    {user.email && (
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    )}
                    {user.role && (
                      <p className="text-xs text-gray-400 mt-0.5">{user.role}</p>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    {onProfile && (
                      <button
                        type="button"
                        onClick={() => {
                          onProfile();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>프로필</span>
                      </button>
                    )}
                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          onLogout();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>로그아웃</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default AGHeader;
