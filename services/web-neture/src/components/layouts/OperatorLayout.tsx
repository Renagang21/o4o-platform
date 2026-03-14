/**
 * OperatorLayout - 플랫폼 운영자 전용 레이아웃
 *
 * WO-O4O-OPERATOR-LAYOUT-SPLIT-V1
 *
 * 목적:
 * - /workspace/operator 하위 모든 페이지에 사용
 * - 운영자 전용 내비게이션 (공급자·파트너 메뉴 분리)
 * - SupplierOpsLayout과 독립된 헤더/네비게이션
 */

import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import AccountMenu from '../AccountMenu';

const OPERATOR_NAV = [
  { label: '대시보드', path: '/workspace/operator' },
  { label: '가입 승인', path: '/workspace/operator/registrations' },
  { label: '공급 현황', path: '/workspace/operator/supply' },
  { label: '사이니지', path: '/workspace/operator/signage/hq-media' },
  { label: '포럼 관리', path: '/workspace/operator/forum-management' },
  { label: 'AI 리포트', path: '/workspace/operator/ai-report' },
  { label: '홈페이지 CMS', path: '/workspace/operator/homepage-cms' },
] as const;

export default function OperatorLayout() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/workspace/operator') {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // 사이니지 하위 경로 전체 활성 처리
  const isNavActive = (path: string) => {
    if (path === '/workspace/operator/signage/hq-media') {
      return location.pathname.startsWith('/workspace/operator/signage');
    }
    return isActive(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <Link to="/workspace/operator" className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary-600">Neture</span>
                <span className="text-sm font-medium text-slate-500 border-l border-slate-300 pl-2">
                  Operator
                </span>
              </Link>
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
            <nav className="flex items-center space-x-1">
              {OPERATOR_NAV.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                    isNavActive(item.path)
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
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
