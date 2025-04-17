import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../common/contexts/AuthContext';

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 사이드바 */}
      <div
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-800 text-white transition-all duration-300`}
      >
        <div className="p-4">
          <h1 className="text-xl font-bold">관리자 패널</h1>
        </div>
        <nav className="mt-4">
          <ul>
            <li>
              <button
                onClick={() => navigate('/admin')}
                className="w-full px-4 py-2 text-left hover:bg-gray-700"
              >
                대시보드
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('/admin/marketplace')}
                className="w-full px-4 py-2 text-left hover:bg-gray-700"
              >
                마켓플레이스
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('/admin/crowdfunding')}
                className="w-full px-4 py-2 text-left hover:bg-gray-700"
              >
                크라우드펀딩
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 헤더 */}
        <header className="bg-white shadow">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-500 hover:text-gray-700"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="flex items-center">
              <span className="mr-4">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>

        {/* 컨텐츠 영역 */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 