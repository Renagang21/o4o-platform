/**
 * AdminSidebar - 지부 관리자 사이드바 (구조 관리 전용)
 *
 * WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1:
 * - Admin은 구조 관리만: 분회, 회원, 위원회, 임원, 설정
 *
 * WO-O4O-ADMIN-DASHBOARD-REFINE-V1:
 * - inline style → Tailwind + lucide-react
 * - flat menu → collapsible groups (표준 Admin Capability 순서)
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  ClipboardCheck,
  Wallet,
  Settings,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Sidebar 그룹 정의                                                   */
/* ------------------------------------------------------------------ */

type SidebarItem = { label: string; path: string; exact?: boolean };
type SidebarGroup = { label: string; icon: LucideIcon; items: SidebarItem[] };

/**
 * 표준 Admin Capability 순서:
 * Overview → Users → Approvals → Finance → System
 */
const ADMIN_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Overview',
    icon: Home,
    items: [
      { label: '대시보드', path: '/admin/dashboard', exact: true },
      { label: '플랫폼 운영', path: '/admin/kpa-dashboard' },
    ],
  },
  {
    label: 'Users',
    icon: Users,
    items: [
      { label: '회원 관리', path: '/admin/members' },
      { label: '위원회 관리', path: '/admin/committee-requests' },
      { label: 'Steward 관리', path: '/admin/stewards' },
    ],
  },
  {
    label: 'Approvals',
    icon: ClipboardCheck,
    items: [
      { label: '분회 관리', path: '/admin/divisions' },
      { label: '신상신고', path: '/admin/annual-report' },
    ],
  },
  {
    label: 'Finance',
    icon: Wallet,
    items: [
      { label: '연회비', path: '/admin/fee' },
    ],
  },
  {
    label: 'System',
    icon: Settings,
    items: [
      { label: '임원 관리', path: '/admin/officers' },
      { label: '설정', path: '/admin/settings' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  AdminSidebar                                                       */
/* ------------------------------------------------------------------ */

export function AdminSidebar() {
  const { pathname } = useLocation();

  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path || pathname === '/admin' || pathname === '/admin/';
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isGroupActive = (group: SidebarGroup) =>
    group.items.some((item) => isItemActive(item.path, item.exact));

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
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-white border-r border-gray-200 flex flex-col z-[100]">
      {/* 지부 정보 */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-gray-200">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
          <span className="text-white text-lg font-bold">KPA</span>
        </div>
        <div>
          <div className="text-base font-semibold text-gray-900">서울특별시약사회</div>
          <div className="text-xs text-blue-600 mt-0.5">지부 관리자</div>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto py-3">
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
                className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors border-l-2 ${
                  isItemActive(item.path, item.exact)
                    ? 'bg-blue-50 text-blue-600 border-blue-600'
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
                className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors border-l-2 ${
                  active
                    ? 'text-blue-600 border-blue-600'
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
                      className={`block pl-12 pr-5 py-2 text-sm transition-colors ${
                        isItemActive(item.path, item.exact)
                          ? 'text-blue-600 bg-blue-50 font-medium'
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

      {/* 하단 링크 */}
      <div className="px-5 py-4 border-t border-gray-200">
        <Link
          to="/"
          className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          ← 메인으로 돌아가기
        </Link>
      </div>
    </aside>
  );
}
