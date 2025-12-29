/**
 * Header Component
 * =============================================================================
 * Application header with navigation and auth status.
 * =============================================================================
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../stores/AuthContext';

export function Header() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-gray-900">
              O4O Web Reference
            </Link>

            <nav className="hidden md:flex space-x-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                홈
              </Link>
              <Link
                to="/forum"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                포럼
              </Link>
            </nav>
          </div>

          {/* Auth Status */}
          <div className="flex items-center space-x-4">
            {isLoading ? (
              <span className="text-gray-400 text-sm">로딩중...</span>
            ) : isAuthenticated ? (
              <>
                <span className="text-gray-600 text-sm">
                  {user?.name || user?.email}
                </span>
                <button
                  onClick={logout}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
