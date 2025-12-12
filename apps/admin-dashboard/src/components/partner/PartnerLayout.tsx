/**
 * PartnerLayout
 *
 * 파트너 섹션 공통 레이아웃
 * - Header: 파트너 정보 및 빠른 액션
 * - Sidebar: 네비게이션 메뉴
 * - Content: 페이지 컨텐츠
 */

import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Link2,
  Sparkles,
  DollarSign,
  Percent,
  User,
  TrendingUp,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/cosmetics-partner/dashboard', label: '대시보드', icon: <LayoutDashboard className="w-4 h-4" /> },
  { path: '/cosmetics-partner/links', label: '추천 링크', icon: <Link2 className="w-4 h-4" /> },
  { path: '/cosmetics-partner/routines', label: '스킨케어 루틴', icon: <Sparkles className="w-4 h-4" /> },
  { path: '/cosmetics-partner/earnings', label: '수익 관리', icon: <DollarSign className="w-4 h-4" /> },
  { path: '/cosmetics-partner/commission-policies', label: '커미션 정책', icon: <Percent className="w-4 h-4" /> },
];

const PartnerLayout: React.FC = () => {
  const location = useLocation();

  const getPageTitle = () => {
    const current = navItems.find(item => location.pathname.startsWith(item.path));
    return current?.label || 'Cosmetics Partner';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Cosmetics Partner</h1>
                <p className="text-sm text-gray-500">{getPageTitle()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>활성 파트너</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)] sticky top-[73px]">
          <nav className="p-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-pink-50 text-pink-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick Stats */}
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">빠른 통계</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">오늘 클릭</span>
                <span className="font-semibold text-gray-900">-</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">이번 달 수익</span>
                <span className="font-semibold text-gray-900">-</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">활성 링크</span>
                <span className="font-semibold text-gray-900">-</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PartnerLayout;
