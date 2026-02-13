/**
 * StoreDashboardLayout - Store Owner 대시보드 공통 Shell
 * WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1 Phase 1
 *
 * 구성:
 *   [ Header: 서비스 로고 + "내 매장" 뱃지 + 홈/유저 ]
 *   [ Sidebar: 공통 9메뉴 (config 기반 필터링) ]
 *   [ Content: <Outlet /> ]
 */

import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Globe,
  Package,
  ShoppingCart,
  CreditCard,
  Monitor,
  Layers,
  Settings,
  Menu,
  X,
  LogOut,
  Home,
} from 'lucide-react';
import type { StoreDashboardConfig, StoreMenuKey } from './storeMenuConfig';
import { ALL_STORE_MENUS } from './storeMenuConfig';

/** 메뉴 키 → lucide 아이콘 매핑 */
const MENU_ICONS: Record<StoreMenuKey, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  identity: Store,
  storefront: Globe,
  products: Package,
  orders: ShoppingCart,
  settlement: CreditCard,
  content: Monitor,
  services: Layers,
  settings: Settings,
};

interface StoreDashboardLayoutProps {
  config: StoreDashboardConfig;
  userName?: string;
  userInitial?: string;
  homeLink?: string;
  onLogout?: () => void;
}

export function StoreDashboardLayout({
  config,
  userName = '',
  userInitial,
  homeLink = '/',
  onLogout,
}: StoreDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const enabledMenuItems = ALL_STORE_MENUS.filter((item) =>
    config.enabledMenus.includes(item.key),
  );

  const initial = userInitial || userName?.charAt(0) || '?';

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ──── Global Header ──── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200/50">
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

          {/* Right: Home + User */}
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
                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ──── Mobile Sidebar Overlay ──── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ──── Sidebar ──── */}
      <aside
        className={`fixed top-14 left-0 z-40 h-[calc(100vh-56px)] w-64 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                <Store className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">내 매장 관리</h2>
                <p className="text-xs text-slate-500">{config.serviceName}</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {enabledMenuItems.map((item) => {
              const Icon = MENU_ICONS[item.key];
              const fullPath = item.subPath
                ? `${config.basePath}${item.subPath}`
                : config.basePath;

              return (
                <NavLink
                  key={item.key}
                  to={fullPath}
                  end={item.key === 'overview'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-teal-100 text-teal-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          {onLogout && (
            <div className="p-4 border-t">
              <button
                onClick={onLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ──── Main Content ──── */}
      <div className="lg:ml-64">
        {/* Mobile menu button bar */}
        <div className="sticky top-14 z-30 bg-white border-b lg:hidden">
          <div className="flex items-center px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
