import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, Home, Settings } from 'lucide-react';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <Home className="w-4 h-4" />
              대시보드
            </Link>
            
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <Settings className="w-4 h-4" />
                관리자
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
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
