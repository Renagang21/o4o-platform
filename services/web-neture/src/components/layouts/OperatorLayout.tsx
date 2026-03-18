/**
 * OperatorLayout - 플랫폼 운영자 전용 레이아웃
 *
 * WO-O4O-OPERATOR-LAYOUT-SPLIT-V1
 * WO-O4O-NETURE-OPERATOR-LAYOUT-SIDEBAR-MIGRATION-V1:
 *   Top Navigation → Sidebar Console 구조 전환
 *   AdminLayout 패턴 재사용, Operator 메뉴 6개 그룹
 *
 * 목적:
 * - /operator 하위 모든 페이지에 사용
 * - Admin Console과 동일한 Sidebar UX 패턴
 * - 16개 Operator 라우트를 6개 논리 그룹으로 정리
 */

import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Home,
  UserCheck,
  Users,
  Truck,
  Store,
  ShoppingCart,
  Monitor,
  Brain,
  Settings,
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

/**
 * WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1:
 * 표준 Capability 그룹 기반 sidebar.
 * 기존 '콘텐츠 관리' 그룹 → Content + Signage + Forum 분리.
 * 그룹명 표준화: 가입 관리→Approvals, 공급 운영→Products, AI 운영→Analytics, 설정→System.
 *
 * WO-NETURE-OPERATOR-DASHBOARD-IMPLEMENTATION-V1:
 * 11-Capability 표준 완성: Users, Stores, Orders 그룹 추가.
 */
const OPERATOR_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Dashboard',
    icon: Home,
    items: [{ label: '대시보드', path: '/operator', exact: true }],
  },
  {
    label: 'Users',
    icon: Users,
    items: [
      { label: '회원 관리', path: '/operator/users' },
    ],
  },
  {
    label: 'Approvals',
    icon: UserCheck,
    items: [
      { label: '가입 승인', path: '/operator/registrations' },
    ],
  },
  {
    label: 'Products',
    icon: Truck,
    items: [
      { label: '공급 현황', path: '/operator/supply' },
    ],
  },
  {
    label: 'Stores',
    icon: Store,
    items: [
      { label: '매장 관리', path: '/operator/stores' },
    ],
  },
  {
    label: 'Orders',
    icon: ShoppingCart,
    items: [
      { label: '주문 관리', path: '/operator/orders' },
    ],
  },
  {
    label: 'Content',
    icon: Monitor,
    items: [
      { label: '홈페이지 CMS', path: '/operator/homepage-cms' },
    ],
  },
  {
    label: 'Signage',
    icon: Monitor,
    items: [
      { label: '사이니지', path: '/operator/signage/hq-media' },
    ],
  },
  {
    label: 'Forum',
    icon: Monitor,
    items: [
      { label: '포럼 관리', path: '/operator/forum-management' },
    ],
  },
  {
    label: 'Analytics',
    icon: Brain,
    items: [
      { label: 'AI 리포트', path: '/operator/ai-report' },
      { label: 'AI 카드 리포트', path: '/operator/ai-card-report' },
      { label: 'AI 운영', path: '/operator/ai-operations' },
      { label: 'Asset Quality', path: '/operator/ai/asset-quality' },
    ],
  },
  {
    label: 'System',
    icon: Settings,
    items: [
      { label: '알림 설정', path: '/operator/settings/notifications' },
      { label: '역할 관리', path: '/operator/roles' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  OperatorLayout                                                     */
/* ------------------------------------------------------------------ */

export default function OperatorLayout() {
  const { pathname } = useLocation();

  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path;
    // 사이니지 하위 경로 전체 활성 처리
    if (path === '/operator/signage/hq-media') {
      return pathname.startsWith('/operator/signage');
    }
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isGroupActive = (group: SidebarGroup) =>
    group.items.some((item) => isItemActive(item.path, item.exact));

  // 현재 활성 그룹은 자동 펼침
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(OPERATOR_SIDEBAR_GROUPS.filter((g) => isGroupActive(g)).map((g) => g.label)),
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
            <div className="flex items-center gap-4">
              <Link to="/operator" className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary-600">Neture</span>
                <span className="text-xs font-medium text-slate-500 border-l border-slate-300 pl-2">
                  Operator
                </span>
              </Link>
              <Link
                to="/"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary-500 transition-colors"
                title="메인 사이트로 이동"
              >
                <Home className="w-3.5 h-3.5" />
                <span>메인</span>
              </Link>
            </div>
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
              {OPERATOR_SIDEBAR_GROUPS.map((group) => {
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
              {OPERATOR_SIDEBAR_GROUPS.map((group) => {
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
              <p>&copy; 2026 Neture. 플랫폼 운영</p>
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
