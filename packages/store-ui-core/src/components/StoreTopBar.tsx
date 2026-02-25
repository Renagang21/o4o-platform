/**
 * StoreTopBar - Store Dashboard 공통 헤더
 * WO-O4O-STORE-ADMIN-LAYOUT-STANDARDIZATION-V1
 *
 * 서비스 로고 + "내 매장" 뱃지 + 홈/유저/로그아웃 + 모바일 햄버거
 */

import { NavLink } from 'react-router-dom';
import { Store, Home, LogOut, Menu } from 'lucide-react';
import type { StoreDashboardConfig } from '../config/storeMenuConfig';

export interface StoreNavItem {
  label: string;
  href: string;
}

export interface StoreTopBarProps {
  config: StoreDashboardConfig;
  userName?: string;
  userInitial?: string;
  homeLink?: string;
  onLogout?: () => void;
  onMenuToggle?: () => void;
  /** 서비스 네비게이션 링크 (TopBar 중앙에 표시) */
  navItems?: StoreNavItem[];
}

export function StoreTopBar({
  config,
  userName = '',
  userInitial,
  homeLink = '/',
  onLogout,
  onMenuToggle,
  navItems,
}: StoreTopBarProps) {
  const initial = userInitial || userName?.charAt(0) || '?';

  return (
    <header className="sticky top-0 z-50 shrink-0 bg-white/95 backdrop-blur-lg border-b border-slate-200/50">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: Logo + Badge */}
        <div className="flex items-center gap-3">
          <NavLink to={homeLink} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-md">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800 hidden sm:inline">
              {config.serviceName}
            </span>
          </NavLink>
          <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-teal-100 text-teal-700">
            내 매장
          </span>
        </div>

        {/* Center: Service Navigation */}
        {navItems && navItems.length > 0 && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Right: Home + User + Mobile Menu */}
        <div className="flex items-center gap-3">
          <NavLink
            to={homeLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <Home className="w-4 h-4" />
            <span className="hidden md:inline">홈</span>
          </NavLink>

          {userName && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                <span className="text-white text-sm font-medium">{initial}</span>
              </div>
              <span className="hidden md:block text-sm font-medium text-slate-700">
                {userName}
              </span>
            </div>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="hidden lg:block p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* Mobile hamburger menu */}
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
