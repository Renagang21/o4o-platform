/**
 * PartnerSpaceLayout - 파트너 협업 공간 레이아웃
 *
 * Work Order: WO-O4O-NETURE-UI-REFACTORING-V1
 *
 * 구조:
 * - 상단: NetureLayout 헤더 (Partner 활성)
 * - 서브 nav: Dashboard | Contents | Links | Stores | Forum
 * - 스코프: /partner/*
 */

import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import AccountMenu from '../AccountMenu';
import { useAuth } from '../../contexts/AuthContext';

export default function PartnerSpaceLayout() {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  const isActive = (path: string) => {
    if (path === '/partner/dashboard') return location.pathname === '/partner/dashboard';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const mainNavClass = (path: string) =>
    `px-3 py-2 text-sm font-medium transition-colors ${
      isActive(path)
        ? 'text-primary-600'
        : 'text-gray-700 hover:text-primary-600'
    }`;

  const subNavClass = (path: string) =>
    `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
      isActive(path)
        ? 'text-primary-600 border-primary-600'
        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
    }`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  const hasAccess = user.roles.some(r => ['partner', 'admin'].includes(r));
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한 없음</h1>
        <p className="text-gray-600 mb-6">이 페이지는 파트너 전용입니다.</p>
        <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary-600">Neture</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              <Link to="/" className={mainNavClass('/')}>Home</Link>
              <Link to="/supplier" className={mainNavClass('/supplier')}>Supplier</Link>
              <Link to="/partner" className={mainNavClass('/partner')}>Partner</Link>
              <Link to="/community" className={mainNavClass('/community')}>Community</Link>
              <Link to="/contact" className={mainNavClass('/contact')}>Contact Us</Link>
              <Link to="/about" className={mainNavClass('/about')}>About</Link>
            </nav>

            <div className="flex items-center">
              <AccountMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Sub Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 -mb-px">
            <Link to="/partner/dashboard" className={subNavClass('/partner/dashboard')}>
              Dashboard
            </Link>
            <Link to="/partner/contents" className={subNavClass('/partner/contents')}>
              Contents
            </Link>
            <Link to="/partner/links" className={subNavClass('/partner/links')}>
              Links
            </Link>
            <Link to="/partner/stores" className={subNavClass('/partner/stores')}>
              Stores
            </Link>
            <Link to="/partner/forum" className={subNavClass('/partner/forum')}>
              Forum
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>&copy; 2026 Neture. 공급자 &middot; 파트너 협업 플랫폼</p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <Link to="/contact" className="hover:text-primary-600 transition-colors">Contact Us</Link>
              <Link to="/about" className="hover:text-primary-600 transition-colors">About</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
