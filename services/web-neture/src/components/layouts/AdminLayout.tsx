/**
 * AdminLayout - 플랫폼 관리자(Admin) 전용 레이아웃
 *
 * WO-O4O-NETURE-ADMIN-LAYOUT-V1
 * WO-O4O-NETURE-ADMIN-NAV-V1: Sidebar Navigation 구조 정비
 *
 * 목적:
 * - /workspace/admin 하위 모든 페이지에 사용
 * - Platform Space 전용 헤더 + 사이드바
 * - 27개 Admin 라우트를 8개 논리 그룹으로 정리
 */

import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Truck,
  Package,
  Handshake,
  ShoppingCart,
  Brain,
  Settings,
  Megaphone,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AccountMenu from '../AccountMenu';

/* ------------------------------------------------------------------ */
/*  Sidebar 그룹 정의                                                   */
/* ------------------------------------------------------------------ */

type SidebarItem = { label: string; path: string; exact?: boolean };
type SidebarGroup = { label: string; icon: LucideIcon; items: SidebarItem[] };

const ADMIN_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Dashboard',
    icon: Home,
    items: [{ label: '대시보드', path: '/workspace/admin', exact: true }],
  },
  {
    label: '사용자 관리',
    icon: Users,
    items: [
      { label: '운영자', path: '/workspace/admin/operators' },
      { label: '문의 메시지', path: '/workspace/admin/contact-messages' },
    ],
  },
  {
    label: '공급자 관리',
    icon: Truck,
    items: [
      { label: '공급자 승인', path: '/workspace/admin/service-approvals' },
      { label: '공급자 목록', path: '/workspace/admin/suppliers' },
    ],
  },
  {
    label: '상품 관리',
    icon: Package,
    items: [
      { label: '상품 승인', path: '/workspace/admin/products' },
      { label: 'Product Masters', path: '/workspace/admin/masters' },
      { label: '카탈로그 Import', path: '/workspace/admin/catalog-import' },
    ],
  },
  {
    label: '파트너 관리',
    icon: Handshake,
    items: [
      { label: '파트너 목록', path: '/workspace/admin/partners' },
      { label: '파트너 정산', path: '/workspace/admin/partner-settlements' },
    ],
  },
  {
    label: '주문·정산',
    icon: ShoppingCart,
    items: [
      { label: '정산 관리', path: '/workspace/admin/settlements' },
      { label: '수수료 관리', path: '/workspace/admin/commissions' },
    ],
  },
  {
    label: '커뮤니티',
    icon: Megaphone,
    items: [
      { label: '광고·스폰서', path: '/workspace/admin/community' },
    ],
  },
  {
    label: 'AI 관리',
    icon: Brain,
    items: [
      { label: 'AI 대시보드', path: '/workspace/admin/ai' },
      { label: 'AI 카드 규칙', path: '/workspace/admin/ai-card-rules' },
      { label: 'AI 비즈니스 팩', path: '/workspace/admin/ai-business-pack' },
    ],
  },
  {
    label: '시스템 설정',
    icon: Settings,
    items: [
      { label: '이메일 설정', path: '/workspace/admin/settings/email' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  AdminLayout                                                        */
/* ------------------------------------------------------------------ */

export default function AdminLayout() {
  const { pathname } = useLocation();

  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path;
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isGroupActive = (group: SidebarGroup) =>
    group.items.some((item) => isItemActive(item.path, item.exact));

  // 현재 활성 그룹은 자동 펼침
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(ADMIN_SIDEBAR_GROUPS.filter((g) => isGroupActive(g)).map((g) => g.label)),
  );

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <Link to="/workspace/admin" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary-600">Neture</span>
              <span className="text-xs font-medium text-slate-500 border-l border-slate-300 pl-2">
                Platform
              </span>
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>

      {/* Body: Sidebar + Content */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* ── Desktop Sidebar ── */}
          <aside className="w-60 flex-shrink-0 hidden md:block">
            <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-6">
              {ADMIN_SIDEBAR_GROUPS.map((group) => {
                const Icon = group.icon;
                const active = isGroupActive(group);
                const isOpen = openGroups.has(group.label);
                const isSingle = group.items.length === 1;

                // 단일 항목 그룹 → 직접 링크
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

                // 복수 항목 그룹 → collapsible
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

          {/* ── Mobile Navigation ── */}
          <div className="md:hidden w-full mb-4">
            <nav className="flex gap-1 overflow-x-auto bg-white rounded-xl border border-gray-200 p-1">
              {ADMIN_SIDEBAR_GROUPS.map((group) => {
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

          {/* ── Main Content ── */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto shrink-0">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="text-center sm:text-left">
              <p>&copy; 2026 Neture. 플랫폼 관리</p>
              <p className="mt-1 text-xs text-gray-400">
                <Link to="/o4o" className="hover:text-primary-600">
                  o4o 플랫폼 소개
                </Link>
                {' · '}
                <Link to="/" className="hover:text-primary-600">
                  메인으로
                </Link>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
