/**
 * KpaOperatorLayout - KPA-A 서비스 운영자 전용 레이아웃
 *
 * WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1:
 *   Neture OperatorLayout 패턴 기반 Sidebar Console 구조.
 *   표준 Capability 그룹 적용.
 */

import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  FileCheck,
  Store,
  FileText,
  Monitor,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/* ------------------------------------------------------------------ */
/*  Sidebar 그룹 정의                                                   */
/* ------------------------------------------------------------------ */

type SidebarItem = { label: string; path: string; exact?: boolean };
type SidebarGroup = { label: string; icon: LucideIcon; items: SidebarItem[] };

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
      { label: '회원 관리', path: '/operator/members' },
      { label: '조직 가입 요청', path: '/operator/organization-requests' },
      { label: '약국 서비스 신청', path: '/operator/pharmacy-requests' },
    ],
  },
  {
    label: 'Approvals',
    icon: FileCheck,
    items: [
      { label: '상품 신청 관리', path: '/operator/product-applications' },
    ],
  },
  {
    label: 'Stores',
    icon: Store,
    items: [
      { label: '매장 관리', path: '/operator/stores' },
      { label: '채널 관리', path: '/operator/store-channels' },
    ],
  },
  {
    label: 'Content',
    icon: FileText,
    items: [
      { label: '공지사항', path: '/operator/news' },
      { label: '자료실', path: '/operator/docs' },
      { label: '콘텐츠 관리', path: '/operator/content' },
    ],
  },
  {
    label: 'Signage',
    icon: Monitor,
    items: [
      { label: '콘텐츠 허브', path: '/operator/signage/content' },
      { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
      { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
      { label: '템플릿', path: '/operator/signage/templates' },
    ],
  },
  {
    label: 'Forum',
    icon: MessageSquare,
    items: [
      { label: '커뮤니티 관리', path: '/operator/community-management' },
      { label: '포럼 관리', path: '/operator/forum-management' },
      { label: '포럼 분석', path: '/operator/forum-analytics' },
      { label: '게시판', path: '/operator/forum' },
    ],
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    items: [
      { label: 'AI 리포트', path: '/operator/ai-report' },
    ],
  },
  {
    label: 'System',
    icon: Settings,
    items: [
      { label: '법률 관리', path: '/operator/legal' },
      { label: '감사 로그', path: '/operator/audit-logs' },
      { label: '운영자 관리', path: '/operator/operators' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  KpaOperatorLayout                                                   */
/* ------------------------------------------------------------------ */

export default function KpaOperatorLayout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path;
    if (path === '/operator/signage/hq-media') {
      return pathname.startsWith('/operator/signage/hq-media');
    }
    if (path === '/operator/signage/hq-playlists') {
      return pathname.startsWith('/operator/signage/hq-playlists');
    }
    if (path === '/operator/signage/templates') {
      return pathname.startsWith('/operator/signage/templates');
    }
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isGroupActive = (group: SidebarGroup) =>
    group.items.some((item) => isItemActive(item.path, item.exact));

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
                <span className="text-xl font-bold text-blue-600">KPA Society</span>
                <span className="text-xs font-medium text-slate-500 border-l border-slate-300 pl-2">
                  Operator
                </span>
              </Link>
              <Link
                to="/"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors"
                title="메인 사이트로 이동"
              >
                <Home className="w-3.5 h-3.5" />
                <span>메인</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <span className="text-sm text-slate-600">{user.name}</span>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 transition-colors"
              >
                <LogOut size={16} />
                로그아웃
              </button>
            </div>
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

                if (isSingle) {
                  const item = group.items[0];
                  return (
                    <Link
                      key={group.label}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
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

                return (
                  <div key={group.label}>
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
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
                            className={`block pl-11 pr-4 py-2 text-sm transition-colors ${
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
                        ? 'bg-blue-50 text-blue-600'
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
              <p>&copy; 2026 KPA Society. 플랫폼 운영</p>
              <p className="mt-1 text-xs text-gray-400">
                <Link to="/" className="hover:text-blue-600">
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
