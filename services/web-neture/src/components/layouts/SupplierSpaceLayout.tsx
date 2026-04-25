/**
 * SupplierSpaceLayout - 공급자 운영 공간 레이아웃
 *
 * Work Order: WO-O4O-DASHBOARD-SIDEBAR-CONVERSION-V1
 *
 * 구조:
 * - 상단: Neture 헤더 (h-14)
 * - 좌측: 사이드바 (w-60, collapsible groups)
 * - 모바일: 수평 아이콘 바
 * - 스코프: /supplier/*
 */

import { useState, useMemo } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import {
  Home,
  Package,
  ShoppingCart,
  FlaskConical,
  CreditCard,
  BookOpen,
  MessageSquare,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NetureGlobalHeader } from '../NetureGlobalHeader';

// WO-NETURE-SUPPLIER-PRODUCT-LIST-WIDE-TABLE-VIEW-APPLY-V1
// 자식 페이지가 본문 영역의 max-width 제약을 해제할 수 있도록 컨텍스트 제공
export type SupplierSpaceOutletContext = {
  wideMode: boolean;
  setWideMode: (next: boolean) => void;
};

/* ------------------------------------------------------------------ */
/*  Sidebar 그룹 정의                                                   */
/* ------------------------------------------------------------------ */

type SidebarItem = { label: string; path: string; exact?: boolean };
type SidebarGroup = { label: string; icon: LucideIcon; items: SidebarItem[] };

const SUPPLIER_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Overview',
    icon: Home,
    items: [{ label: 'Dashboard', path: '/supplier/dashboard', exact: true }],
  },
  {
    label: 'Products',
    icon: Package,
    items: [
      { label: '상품 관리', path: '/supplier/products' },
      { label: 'CSV Import', path: '/supplier/csv-import' },
      { label: 'B2B 콘텐츠', path: '/supplier/b2b-content' },
    ],
  },
  {
    label: 'Orders',
    icon: ShoppingCart,
    items: [{ label: '주문 현황', path: '/supplier/orders' }],
  },
  {
    label: 'Market Trial',
    icon: FlaskConical,
    items: [{ label: 'Market Trial', path: '/supplier/market-trial' }],
  },
  {
    label: 'Finance',
    icon: CreditCard,
    items: [{ label: 'Partner Commissions', path: '/supplier/partner-commissions' }],
  },
  {
    label: 'Content',
    icon: BookOpen,
    items: [{ label: 'Library', path: '/supplier/library' }],
  },
  {
    label: 'Community',
    icon: MessageSquare,
    items: [
      { label: 'Forum', path: '/supplier/forum' },
      { label: '내 포럼', path: '/supplier/my-forum' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  SupplierSpaceLayout                                                */
/* ------------------------------------------------------------------ */

export default function SupplierSpaceLayout() {
  const { pathname } = useLocation();
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path;
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isGroupActive = (group: SidebarGroup) =>
    group.items.some((item) => isItemActive(item.path, item.exact));

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(SUPPLIER_SIDEBAR_GROUPS.filter((g) => isGroupActive(g)).map((g) => g.label)),
  );

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // WO-NETURE-SUPPLIER-PRODUCT-LIST-WIDE-TABLE-VIEW-APPLY-V1
  // 자식 페이지가 opt-in 으로 본문 max-width 제약을 해제할 수 있게 한다.
  const [wideMode, setWideMode] = useState(false);
  const outletContext = useMemo<SupplierSpaceOutletContext>(
    () => ({ wideMode, setWideMode }),
    [wideMode],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  const hasAccess = user.roles.some(r => ['neture:supplier', 'supplier', 'neture:admin', 'platform:super_admin'].includes(r));
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한 없음</h1>
        <p className="text-gray-600 mb-6">이 페이지는 공급자 전용입니다.</p>
        <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Layer A — GlobalHeader */}
      <NetureGlobalHeader />

      {/* Body: Sidebar + Content */}
      {/* WO-NETURE-SUPPLIER-PRODUCT-LIST-WIDE-TABLE-VIEW-APPLY-V1:
          wideMode 활성 시 max-w 제약 해제하여 wide table 가로 영역 확장 */}
      <div
        className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 ${
          wideMode ? 'max-w-none' : 'max-w-[1400px]'
        }`}
      >
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="w-60 flex-shrink-0 hidden md:block">
            <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-20">
              {SUPPLIER_SIDEBAR_GROUPS.map((group) => {
                const Icon = group.icon;
                const active = isGroupActive(group);
                const isOpen = openGroups.has(group.label);
                const isSingle = group.items.length === 1;

                if (isSingle) {
                  const item = group.items[0];
                  return (
                    <Link
                      key={group.label}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                        isItemActive(item.path, item.exact)
                          ? 'bg-primary-50 text-primary-600 border-primary-600'
                          : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <div key={group.label}>
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                        active
                          ? 'text-primary-600 border-primary-600'
                          : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="flex-1 text-left">{group.label}</span>
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="pb-1">
                        {group.items.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`block pl-11 pr-4 py-2 text-sm transition-colors ${
                              isItemActive(item.path, item.exact)
                                ? 'text-primary-600 bg-primary-50 font-medium'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Mobile Navigation */}
          <div className="md:hidden w-full mb-4">
            <nav className="flex gap-1 overflow-x-auto bg-white rounded-xl border border-gray-200 p-1">
              {SUPPLIER_SIDEBAR_GROUPS.map((group) => {
                const Icon = group.icon;
                const active = isGroupActive(group);
                const firstPath = group.items[0].path;
                return (
                  <Link
                    key={group.label}
                    to={firstPath}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={14} />
                    {group.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Outlet context={outletContext} />
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto shrink-0">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>&copy; 2026 Neture. 공급자 &middot; 파트너 협업 플랫폼</p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <Link to="/contact" className="hover:text-primary-600 transition-colors">Contact Us</Link>
              <Link to="/about" className="hover:text-primary-600 transition-colors">About</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
