/**
 * StoreSidebar - Store Dashboard 사이드바 내부 콘텐츠
 * WO-O4O-STORE-ADMIN-LAYOUT-STANDARDIZATION-V1
 *
 * 사이드바 헤더 + 네비게이션 메뉴 + 로그아웃 버튼
 * 서비스 컨텍스트 표시는 TopBar에서만 처리 (사이드바에서는 제거)
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Package,
  LayoutGrid,
  ShoppingCart,
  FileText,
  Monitor,
  Receipt,
  Settings,
  X,
  LogOut,
} from 'lucide-react';
import type { StoreDashboardConfig, StoreMenuKey } from '../config/storeMenuConfig';
import { ALL_STORE_MENUS } from '../config/storeMenuConfig';

/** Store Core v1.0 메뉴 키 → lucide 아이콘 매핑 */
const MENU_ICONS: Record<StoreMenuKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  products: Package,
  channels: LayoutGrid,
  orders: ShoppingCart,
  content: FileText,
  signage: Monitor,
  billing: Receipt,
  settings: Settings,
};

export interface StoreSidebarProps {
  config: StoreDashboardConfig;
  onLogout?: () => void;
  onItemClick?: () => void;
  onClose?: () => void;
  /** 소속 조직명 (제공 시 "조직명 매장", 미제공 시 "내 매장 관리") */
  orgName?: string;
}

export function StoreSidebar({
  config,
  onLogout,
  onItemClick,
  onClose,
  orgName,
}: StoreSidebarProps) {
  const enabledMenuItems = ALL_STORE_MENUS.filter((item) =>
    config.enabledMenus.includes(item.key),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <Store className="w-5 h-5 text-teal-700" />
          </div>
          <h2 className="font-bold text-slate-800">{orgName ? `${orgName} 매장` : '내 매장 관리'}</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
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
              end={item.key === 'dashboard'}
              onClick={onItemClick}
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
  );
}
