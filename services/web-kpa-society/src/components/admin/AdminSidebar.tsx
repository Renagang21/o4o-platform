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
  LayoutDashboard,
  Users,
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
 * WO-O4O-KPA-ADMIN-ORG-MANAGEMENT-DEADCODE-REMOVE-V1:
 * 약사회 조직관리(위원회/Steward) 제거 후 관리자 홈만 유지.
 */
const ADMIN_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { label: '관리자 홈', path: '/admin/kpa-dashboard', exact: true },
    ],
  },
  {
    label: '운영 기능',
    icon: Users,
    items: [
      // WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1:
      //   admin sidebar → /admin/members (완전삭제 워크플로우 전용).
      //   /operator/members 는 운영자 회원관리(승인/반려/정지/복원/탈퇴) 로 잔존.
      { label: '회원 관리', path: '/admin/members' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  AdminSidebar                                                       */
/* ------------------------------------------------------------------ */

export function AdminSidebar() {
  const { pathname } = useLocation();

  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) {
      // 관리자 홈(/admin/kpa-dashboard)은 /admin 루트에서도 active
      return pathname === path || pathname === '/admin' || pathname === '/admin/';
    }
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
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-[260px] bg-white border-r border-gray-200 flex flex-col z-40">
      {/* WO-O4O-KPA-ADMIN-DASHBOARD-ORG-BRANDING-REMOVAL-V1:
          organization branding (KPA icon + "서울특별시약사회" + "관리자") 블록 제거.
          KPA-Society 는 특정 organization 기반 관리 서비스가 아님.
          관리자 식별은 페이지 헤더("관리자 대시보드") + global header 가 담당. */}

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
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-600'
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
                    ? 'text-indigo-600 border-indigo-600'
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
                          ? 'text-indigo-600 bg-indigo-50 font-medium'
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
