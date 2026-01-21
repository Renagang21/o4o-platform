/**
 * SupplierOpsLayout - 공급자 운영 서비스 레이아웃
 *
 * Work Order: WO-SUPPLIER-OPS-ROUTE-REFACTOR-V1
 *
 * 목적:
 * - Neture 고유 기능(공급자 중심 운영/연결 서비스)을 위한 전용 레이아웃
 * - o4o 공통 영역과 분리된 네비게이션 구조
 *
 * 스코프:
 * - /supplier-ops 하위 모든 페이지
 * - 공급자, 파트너, 제휴 요청, 콘텐츠, 포럼
 * - admin, operator 대시보드
 */

import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import AccountMenu from '../AccountMenu';

export default function SupplierOpsLayout() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - links to supplier-ops home */}
            <div className="flex items-center gap-4">
              <Link to="/supplier-ops" className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary-600">Neture</span>
                <span className="text-sm font-medium text-slate-500 border-l border-slate-300 pl-2">
                  공급자 연결
                </span>
              </Link>
              {/* 메인 사이트 링크 */}
              <Link
                to="/"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary-500 transition-colors ml-2"
                title="메인 사이트로 이동"
              >
                <Home className="w-3.5 h-3.5" />
                <span>메인</span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-4">
              <Link
                to="/supplier-ops"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === '/supplier-ops'
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                홈
              </Link>
              <Link
                to="/supplier-ops/suppliers"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/supplier-ops/suppliers')
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                공급자
              </Link>
              <Link
                to="/supplier-ops/partners/info"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/supplier-ops/partners/info')
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                참여 안내
              </Link>
              <Link
                to="/supplier-ops/partners/requests"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/supplier-ops/partners/requests')
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                제휴 요청
              </Link>
              <Link
                to="/supplier-ops/content"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/supplier-ops/content')
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                콘텐츠
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                to="/supplier-ops/partners/apply"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/supplier-ops/partners/apply')
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                참여 신청
              </Link>
              <Link
                to="/supplier-ops/forum"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/supplier-ops/forum')
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                포럼
              </Link>
              {/* Account Menu */}
              <AccountMenu />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>&copy; 2026 Neture. 공급자 중심 운영·연결 서비스</p>
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
      </footer>
    </div>
  );
}
