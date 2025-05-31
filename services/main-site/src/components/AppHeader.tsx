import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useAuth, AuthContext } from '../context/AuthContext'; // useAuth 훅과 AuthContext를 모두 import

const AppHeader: React.FC = () => {
  const user = useAuth(); // useAuth()는 이제 User | null을 직접 반환합니다.
  const { setUser } = React.useContext(AuthContext)!; // AuthContext에서 setUser 함수를 가져옵니다.
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null); // setUser를 사용하여 로그아웃 처리 (user를 null로 설정)
    navigate('/');
  };

  return (
    <header className="w-full bg-white dark:bg-gray-900 shadow">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">yaksa.site</Link>
        <nav className="flex items-center gap-4">
          <Link to="/" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium">홈</Link>
          <Link to="/forum" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium">커뮤니티</Link>
          {user?.role === 'yaksa' && (
            <Link to="/products/new" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium">제품 등록</Link>
          )}
          {user?.role === 'yaksa' && (
            <Link to="/profile" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium">마이페이지</Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin/dashboard" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium">대시보드</Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin/approvals" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium">사용자 관리</Link>
          )}
          <ThemeToggle />
          {user ? (
            <>
              <span className="text-gray-700 dark:text-gray-200 font-medium">{user.name}</span>
              <button onClick={handleLogout} className="ml-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100">로그아웃</button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">로그인</Link>
              <Link to="/register" className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100">회원가입</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default AppHeader;
