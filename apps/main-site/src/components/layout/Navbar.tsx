import { FC, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, Home, Settings, Briefcase, ShoppingCart, Users, Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { wishlistService } from '../../services/wishlistService';

const Navbar: FC = () => {
  const navigate = useNavigate();
  const { user, hasRole, logout } = useAuth();

  // R-6-6: Wishlist count state
  const [wishlistCount, setWishlistCount] = useState(0);

  // R-6-6: Load wishlist count
  const loadWishlistCount = async () => {
    if (!user) {
      setWishlistCount(0);
      return;
    }

    try {
      const count = await wishlistService.getWishlistCount();
      setWishlistCount(count);
    } catch (error) {
      console.error('Failed to load wishlist count:', error);
      setWishlistCount(0);
    }
  };

  // R-6-6: Load wishlist count when user changes
  useEffect(() => {
    loadWishlistCount();

    // Refresh count every 30 seconds (optional)
    const interval = setInterval(loadWishlistCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            <span className="text-xl font-bold text-indigo-600">Neture</span>
          </Link>

          {/* Navigation Links - P0 RBAC */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <Home className="w-4 h-4" />
              홈
            </Link>

            {/* Role-based Dashboard Links */}
            {hasRole('supplier') && (
              <Link
                to="/dashboard/supplier"
                className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <Briefcase className="w-4 h-4" />
                공급자 대시보드
              </Link>
            )}

            {hasRole('seller') && (
              <Link
                to="/dashboard/seller"
                className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                판매자 대시보드
              </Link>
            )}

            {hasRole('partner') && (
              <Link
                to="/dashboard/partner"
                className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <Users className="w-4 h-4" />
                파트너 대시보드
              </Link>
            )}

            {/* Application Links - Show if no role yet */}
            {user && !hasRole('supplier') && !hasRole('seller') && !hasRole('partner') && !hasRole('admin') && (
              <div className="flex items-center gap-4">
                <Link
                  to="/apply/supplier"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  공급자 신청
                </Link>
                <Link
                  to="/apply/seller"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  판매자 신청
                </Link>
                <Link
                  to="/apply/partner"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  파트너 신청
                </Link>
              </div>
            )}

            {/* Admin Link */}
            {hasRole('admin') && (
              <Link
                to="https://admin.neture.co.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <Settings className="w-4 h-4" />
                관리자
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* R-6-6: Wishlist Link with Badge */}
            {user && (
              <Link
                to="/my-account/wishlist"
                className="relative flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
                title="위시리스트"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
                <span className="hidden md:inline">위시리스트</span>
              </Link>
            )}

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.businessInfo?.businessName}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
