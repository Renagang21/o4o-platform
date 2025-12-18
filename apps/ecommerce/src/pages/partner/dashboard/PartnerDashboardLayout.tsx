/**
 * Partner Dashboard Layout
 *
 * 파트너 대시보드 레이아웃 (사이드바 + 콘텐츠)
 *
 * @package Phase K - Partner Flow
 */

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { usePartner } from '../../../hooks/usePartner';
import { authClient } from '@o4o/auth-client';
import { useEffect } from 'react';

const navItems = [
  { path: '/partner/dashboard', label: '홈', icon: 'home', end: true },
  { path: '/partner/dashboard/links', label: '추천 링크', icon: 'link' },
  { path: '/partner/dashboard/earnings', label: '수익 현황', icon: 'chart' },
  { path: '/partner/dashboard/content', label: '콘텐츠', icon: 'document' },
];

export function PartnerDashboardLayout() {
  const navigate = useNavigate();
  const { currentPartner, isPartner, isLoading } = usePartner();
  const user = authClient.getCurrentUser();

  // 접근 제어
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/login?redirect=/partner/dashboard');
      } else if (!isPartner) {
        navigate('/partner/signup');
      }
    }
  }, [user, isPartner, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (!isPartner) {
    return null; // redirect 처리 중
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NavLink
              to="/partner"
              className="text-xl font-bold text-blue-600"
            >
              Partner
            </NavLink>
            {currentPartner && (
              <span className="text-sm text-gray-600">
                {currentPartner.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {currentPartner && (
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  currentPartner.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : currentPartner.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {currentPartner.status === 'active'
                  ? '활성'
                  : currentPartner.status === 'pending'
                  ? '승인 대기'
                  : currentPartner.status}
              </span>
            )}
            <NavLink to="/" className="text-sm text-gray-600 hover:text-gray-900">
              쇼핑몰로 돌아가기
            </NavLink>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <nav className="bg-white rounded-xl shadow-sm p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    <NavIcon icon={item.icon} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Partner Info Card */}
          {currentPartner && (
            <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
              <div className="text-sm text-gray-600 mb-2">등급</div>
              <div className="font-semibold text-gray-900 capitalize">
                {currentPartner.level}
              </div>
              <div className="mt-4 text-sm text-gray-600 mb-2">커미션율</div>
              <div className="font-semibold text-blue-600">
                {currentPartner.commissionRate}%
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavIcon({ icon }: { icon: string }) {
  const paths: Record<string, string> = {
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    link: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    chart:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    document:
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  };

  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={paths[icon] || paths.home}
      />
    </svg>
  );
}
