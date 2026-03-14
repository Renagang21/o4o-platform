/**
 * AdminLayout - 플랫폼 관리자(Admin) 전용 레이아웃
 *
 * WO-O4O-NETURE-ADMIN-LAYOUT-V1
 *
 * 목적:
 * - /workspace/admin 하위 모든 페이지에 사용
 * - Platform Space 전용 헤더·사이드바
 * - SupplierOpsLayout("공급자·파트너") 대신 사용
 */

import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import AccountMenu from '../AccountMenu';

const ADMIN_NAV = [
  { label: '대시보드', path: '/workspace/admin' },
  { label: '공급자', path: '/workspace/admin/suppliers' },
  { label: '상품', path: '/workspace/admin/products' },
  { label: '파트너', path: '/workspace/admin/partners' },
  { label: '정산', path: '/workspace/admin/settlements' },
  { label: 'AI 관리', path: '/workspace/admin/ai' },
  { label: '설정', path: '/workspace/admin/settings/email' },
] as const;

export default function AdminLayout() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/workspace/admin') {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isNavActive = (path: string) => {
    // 공급자 관련 하위 그룹
    if (path === '/workspace/admin/suppliers') {
      return (
        isActive('/workspace/admin/suppliers') ||
        isActive('/workspace/admin/masters') ||
        isActive('/workspace/admin/service-approvals') ||
        isActive('/workspace/admin/operators') ||
        isActive('/workspace/admin/catalog-import') ||
        isActive('/workspace/admin/contact-messages')
      );
    }
    // 상품 관련
    if (path === '/workspace/admin/products') {
      return (
        isActive('/workspace/admin/products') ||
        isActive('/workspace/admin/ai-card-rules') ||
        isActive('/workspace/admin/ai-business-pack')
      );
    }
    // 파트너 관련
    if (path === '/workspace/admin/partners') {
      return (
        isActive('/workspace/admin/partners') ||
        isActive('/workspace/admin/commissions') ||
        isActive('/workspace/admin/partner-settlements')
      );
    }
    // 정산
    if (path === '/workspace/admin/settlements') {
      return isActive('/workspace/admin/settlements');
    }
    // AI 관리 하위
    if (path === '/workspace/admin/ai') {
      return isActive('/workspace/admin/ai');
    }
    // 설정
    if (path === '/workspace/admin/settings/email') {
      return isActive('/workspace/admin/settings');
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
              <Link to="/workspace/admin" className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary-600">Neture</span>
                <span className="text-sm font-medium text-slate-500 border-l border-slate-300 pl-2">
                  Platform
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
              {ADMIN_NAV.map((item) => (
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
              <p>&copy; 2026 Neture. 플랫폼 관리</p>
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
