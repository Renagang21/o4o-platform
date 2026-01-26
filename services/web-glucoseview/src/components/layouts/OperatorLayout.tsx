/**
 * OperatorLayout - GlucoseView 운영자 레이아웃
 * 운영자 대시보드 페이지를 위한 전용 레이아웃
 */

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function OperatorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left - Logo & Section */}
          <div className="flex items-center gap-4">
            <NavLink to="/" className="text-xl font-bold text-blue-600">
              GlucoseView
            </NavLink>
            <span className="text-slate-300">|</span>
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
              운영자
            </span>
          </div>

          {/* Center - Navigation */}
          <nav className="flex items-center gap-1">
            <NavLink
              to="/operator/glucoseview/applications"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              신청 관리
            </NavLink>
            <NavLink
              to="/operator/glucoseview/ai-report"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              AI 리포트
            </NavLink>
          </nav>

          {/* Right - User Menu */}
          <div className="flex items-center gap-4">
            <NavLink
              to="/"
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              메인으로
            </NavLink>
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">
                      {user.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <span className="text-sm text-slate-700">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-500">
            GlucoseView 운영자 대시보드
          </p>
        </div>
      </footer>
    </div>
  );
}
