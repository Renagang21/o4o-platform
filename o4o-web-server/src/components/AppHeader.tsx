import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useAuthStore } from '../../../services/ecommerce/web/src/store/authStore';

const AppHeader: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex items-center justify-between py-4 px-6 border-b bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-blue-700">yaksa.site</span>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {!isAuthenticated ? (
          <Link to="/login" className="btn btn-sm btn-outline">로그인</Link>
        ) : (
          <>
            <Link to="/account" className="btn btn-sm btn-outline">내 계정</Link>
            <button onClick={handleLogout} className="btn btn-sm btn-outline">로그아웃</button>
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <Link to="/admin/main" className="btn btn-sm btn-primary">관리자</Link>
            )}
          </>
        )}
      </div>
    </header>
  );
};

export default AppHeader; 