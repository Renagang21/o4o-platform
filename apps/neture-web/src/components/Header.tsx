/**
 * Header Component
 *
 * Phase G-2: B2C 핵심 기능 확장
 * 네비게이션 + 로그인/장바구니 버튼
 */

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

export default function Header() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-blue-600">Neture</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/products"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              상품
            </Link>
            <Link
              to="/products?category=healthcare"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              건강관리
            </Link>
            <Link
              to="/products?category=beauty"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              뷰티
            </Link>
            <Link
              to="/products?category=food"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              푸드
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-2 text-gray-600 hover:text-gray-900"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>

            {/* Auth */}
            {isLoading ? (
              <div className="w-20 h-8 bg-gray-100 rounded animate-pulse" />
            ) : isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link
                  to="/orders"
                  className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block"
                >
                  주문내역
                </Link>
                <span className="text-sm text-gray-600 hidden sm:block">
                  {user?.name}님
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-100">
        <div className="flex justify-around py-2">
          <Link to="/products" className="text-sm text-gray-600 hover:text-gray-900">
            상품
          </Link>
          <Link to="/products?category=healthcare" className="text-sm text-gray-600 hover:text-gray-900">
            건강관리
          </Link>
          <Link to="/products?category=beauty" className="text-sm text-gray-600 hover:text-gray-900">
            뷰티
          </Link>
          <Link to="/products?category=food" className="text-sm text-gray-600 hover:text-gray-900">
            푸드
          </Link>
        </div>
      </div>
    </header>
  );
}
