import { Link, Outlet, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import AccountMenu from '../AccountMenu';
import { useAuth } from '../../contexts';
import { isAdminVaultAuthorized } from '../../utils/adminVaultAuth';

/**
 * MainLayout - o4o 공통 영역 레이아웃
 *
 * Work Orders:
 * - WO-SUPPLIER-OPS-ROUTE-REFACTOR-V1
 * - WO-O4O-ADMIN-VAULT-ACCESS-V1: Admin Vault 메뉴 조건부 노출
 *
 * 스코프:
 * - /, /o4o, /channel/*, /seller/overview/*, /partner/overview-info
 * - /test-center, /test-guide (다중 서비스)
 *
 * Neture 고유 기능은 /supplier-ops로 분리됨
 */
export default function MainLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const showAdminVault = isAdminVaultAuthorized(user?.email);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">o4o</span>
              <span className="text-xs text-slate-500 hidden sm:inline">(online for offline)</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                홈
              </Link>
              <Link
                to="/o4o"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/o4o')
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                플랫폼 소개
              </Link>
              <Link
                to="/channel/structure"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/channel')
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                채널
              </Link>
              <Link
                to="/seller/overview"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/seller')
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                판매자 안내
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                to="/supplier-ops"
                className="px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                Neture
              </Link>
              <Link
                to="/test-guide"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/test-guide') || isActive('/test-center')
                    ? 'text-primary-600'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                테스트
              </Link>
              {/* Admin Vault - 권한 있는 경우만 노출 */}
              {showAdminVault && (
                <>
                  <span className="text-gray-300">|</span>
                  <Link
                    to="/admin-vault"
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Vault
                  </Link>
                </>
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
          <div className="text-center text-gray-500 text-sm">
            <p>&copy; 2026 o4o Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
