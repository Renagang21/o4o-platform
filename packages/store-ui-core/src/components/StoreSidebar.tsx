/**
 * StoreSidebar - Store Dashboard 사이드바 내부 콘텐츠
 * WO-O4O-STORE-ADMIN-LAYOUT-STANDARDIZATION-V1
 * WO-O4O-STORE-HUB-STRUCTURE-REFACTOR-V1: section-based 렌더링 추가
 *
 * 사이드바 헤더 + 네비게이션 메뉴 + 로그아웃 버튼
 * 서비스 컨텍스트 표시는 TopBar에서만 처리 (사이드바에서는 제거)
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  LayoutGrid,
  ShoppingCart,
  FileText,
  Monitor,
  Receipt,
  Settings,
  X,
  LogOut,
  BookOpen,
  QrCode,
  Megaphone,
  BarChart3,
  Newspaper,
  Tag,
  Truck,
  Tablet,
  MonitorSmartphone,
  PanelLeft,
  Palette,
  ClipboardList,
  Building2,
} from 'lucide-react';
import type { StoreDashboardConfig, StoreMenuKey } from '../config/storeMenuConfig';
import { ALL_STORE_MENUS } from '../config/storeMenuConfig';

/** Store Core v1.0 메뉴 키 → lucide 아이콘 매핑 (flat mode) */
const MENU_ICONS: Record<StoreMenuKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  products: Package,
  'local-products': ShoppingBag,
  channels: LayoutGrid,
  orders: ShoppingCart,
  content: FileText,
  signage: Monitor,
  billing: Receipt,
  settings: Settings,
};

/** Section mode 아이콘 매핑 (WO-KPA-STORE-SIDEBAR-REALIGNMENT-V1) */
const SECTION_ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  'pharmacy-info': Building2,
  'orderable-products': ClipboardList,
  library: BookOpen,
  qr: QrCode,
  pop: Megaphone,
  signage: Monitor,
  products: Package,
  'local-products': ShoppingBag,
  orders: ShoppingCart,
  'analytics-marketing': BarChart3,
  content: FileText,
  blog: Newspaper,
  b2c: Tag,
  suppliers: Truck,
  'order-worktable': ClipboardList,
  channels: LayoutGrid,
  'tablet-channels': Tablet,
  'tablet-displays': MonitorSmartphone,
  'store-settings': Settings,
  'layout-builder': PanelLeft,
  template: Palette,
  billing: Receipt,
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
      <nav className="flex-1 p-4 overflow-y-auto">
        {config.menuSections ? (
          /* Section-based rendering */
          <div className="space-y-4">
            {config.menuSections.map((section, sIdx) => (
              <div key={sIdx}>
                {section.label && (
                  <div className="px-4 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {section.label}
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = SECTION_ICONS[item.key] || FileText;
                    const fullPath = `${config.basePath}${item.subPath}`;

                    return (
                      <NavLink
                        key={item.key}
                        to={fullPath}
                        end={item.key === 'dashboard'}
                        onClick={onItemClick}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-teal-100 text-teal-700'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Flat rendering (backward-compat) */
          <div className="space-y-1">
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
          </div>
        )}
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
