/**
 * AdminSidebar - 분회 관리자 사이드바 (구조 관리 전용)
 *
 * WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1:
 * - 콘텐츠 CRUD (공지사항, 게시판, 자료실) → BranchOperator 이동
 * - Admin은 구조 관리만: 대시보드, 임원 관리, 분회 설정
 *
 * WO-O4O-ADMIN-DASHBOARD-REFINE-V1:
 * - inline style → Tailwind + lucide-react
 * - dark theme → white theme (Neture 패턴)
 */

import { Link, useLocation, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCog,
  ShoppingBag,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: '대시보드', path: '' },
  { icon: UserCog, label: '임원 관리', path: '/officers' },
  { icon: ShoppingBag, label: '공동구매 현황', path: '/groupbuy-status' },
  { icon: Settings, label: '분회 설정', path: '/settings' },
];

export function AdminSidebar() {
  const { pathname } = useLocation();
  const { branchId } = useParams();
  const basePath = `/branch-services/${branchId}/admin`;

  const isActive = (path: string) => {
    const fullPath = basePath + path;
    if (path === '') {
      return pathname === basePath || pathname === basePath + '/';
    }
    return pathname.startsWith(fullPath);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-white border-r border-gray-200 flex flex-col z-[100]">
      {/* 분회 정보 */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-gray-200">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
          <span className="text-white text-lg font-bold">분회</span>
        </div>
        <div>
          <div className="text-base font-semibold text-gray-900">강남분회</div>
          <div className="text-xs text-blue-600 mt-0.5">분회 관리자</div>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto py-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={basePath + item.path}
              className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors border-l-2 ${
                active
                  ? 'bg-blue-50 text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 하단 링크 */}
      <div className="px-5 py-4 border-t border-gray-200">
        <Link
          to={`/branch-services/${branchId}`}
          className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          ← 분회 사이트로 이동
        </Link>
      </div>
    </aside>
  );
}
