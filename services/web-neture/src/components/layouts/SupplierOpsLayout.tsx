/**
 * SupplierOpsLayout - 공급자 운영 서비스 레이아웃
 *
 * Work Order: WO-SUPPLIER-OPS-ROUTE-REFACTOR-V1
 * WO-NETURE-HUB-ARCHITECTURE-RESTRUCTURE-V1: 메뉴 재정렬 (홈/상품/콘텐츠/정산/허브)
 *
 * 목적:
 * - Neture 고유 기능(공급자 중심 운영/연결 서비스)을 위한 전용 레이아웃
 * - o4o 공통 영역과 분리된 네비게이션 구조
 *
 * 스코프:
 * - /workspace 하위 모든 페이지
 * - 공급자, 파트너, 제휴 요청, 콘텐츠, 포럼
 * - admin, operator 대시보드
 */

import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import AccountMenu from '../AccountMenu';
import { useAuth } from '../../contexts/AuthContext';

export default function SupplierOpsLayout() {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // 허브 접근 가능 역할: supplier, partner, admin
  const hasHubAccess = user?.roles.some(r => ['admin', 'supplier', 'partner'].includes(r));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - links to workspace home */}
            <div className="flex items-center gap-4">
              <Link to="/workspace" className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary-600">Neture</span>
                <span className="text-sm font-medium text-slate-500 border-l border-slate-300 pl-2">
                  공급자 · 파트너
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

            {/* Navigation — WO-NETURE-HUB-ARCHITECTURE-RESTRUCTURE-V1: 홈/상품/콘텐츠/정산/허브 */}
            <nav className="flex items-center space-x-4">
              <Link
                to="/workspace"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === '/workspace'
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                홈
              </Link>
              <Link
                to="/workspace/supplier/products"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/workspace/supplier/products')
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                상품
              </Link>
              <Link
                to="/workspace/content"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/workspace/content')
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                콘텐츠
              </Link>
              <Link
                to="/workspace/partner/settlements"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/workspace/partner/settlements')
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                정산
              </Link>
              {hasHubAccess && (
                <Link
                  to="/workspace/hub"
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    isActive('/workspace/hub')
                      ? 'text-primary-600'
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  허브
                </Link>
              )}
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="text-center sm:text-left">
              <p>&copy; 2026 Neture. 공급자·파트너 연결 서비스</p>
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
            <Link to="/forum/test-feedback" className="text-xs text-green-600 hover:text-green-700 transition-colors">
              🧪 테스트 센터
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
