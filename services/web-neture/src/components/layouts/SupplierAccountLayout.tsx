/**
 * SupplierAccountLayout - 공급자 계정 대시보드 레이아웃
 *
 * Work Order: WO-O4O-SUPPLIER-DASHBOARD-PAGE-V1
 *
 * 구조:
 * - Header: Neture 로고 + AccountMenu
 * - Sidebar: Dashboard / Products / Offers / Orders / Forum
 * - Main: <Outlet />
 */

import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NetureGlobalHeader } from '../NetureGlobalHeader';

const SIDEBAR_ITEMS = [
  { label: 'Dashboard', path: '/account/supplier', icon: LayoutDashboard, exact: true },
  { label: 'Products', path: '/account/supplier/products', icon: Package },
  { label: 'Orders', path: '/account/supplier/orders', icon: ShoppingCart },
];

export default function SupplierAccountLayout() {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

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

  const hasAccess = user.roles.some((r: string) => ['neture:supplier', 'supplier', 'neture:admin', 'platform:super_admin'].includes(r));
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한 없음</h1>
        <p className="text-gray-600 mb-6">이 페이지는 공급자 전용입니다.</p>
        <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Layer A — GlobalHeader */}
      <NetureGlobalHeader />

      {/* Sidebar + Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-56 flex-shrink-0 hidden md:block">
            <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                      active
                        ? 'bg-primary-50 text-primary-600 border-primary-600'
                        : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Mobile Navigation */}
          <div className="md:hidden w-full mb-4">
            <nav className="flex gap-1 overflow-x-auto bg-white rounded-xl border border-gray-200 p-1">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
