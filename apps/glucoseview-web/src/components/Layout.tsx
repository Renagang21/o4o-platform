import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';
import { AIChatButton } from './ai';

const navItems = [
  { path: '/', label: 'Home', protected: false },
  { path: '/patients', label: 'Patients', protected: true },
  { path: '/insights', label: 'Insights', protected: true },
  { path: '/settings', label: 'Settings', protected: true },
  { path: '/about', label: 'About', protected: false },
];

export default function Layout() {
  const { user, logout, isAuthenticated, isApproved } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if (item.protected && (!isAuthenticated || !isApproved)) {
      e.preventDefault();
      setShowLoginModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <NavLink to="/" className="text-lg font-semibold text-slate-800">
              GlucoseView
            </NavLink>

            {/* Menu Items */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={(e) => handleNavClick(e, item)}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              {/* User Info & Logout OR Login Button */}
              <div className="ml-4 pl-4 border-l border-slate-200 flex items-center gap-3">
                {isAuthenticated ? (
                  <>
                    <span className="text-sm text-slate-600">{user?.displayName || user?.name}</span>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    로그인
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-14 pb-24">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* 상단 영역 - 서비스 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* 서비스 소개 */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">GlucoseView</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                약국을 위한 CGM 데이터 정리 도구입니다.
                환자별 혈당 데이터를 정리하여 효과적인 상담을 지원합니다.
              </p>
            </div>

            {/* 빠른 링크 */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">바로가기</h4>
              <ul className="space-y-2">
                <li>
                  <NavLink to="/about" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                    서비스 안내
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/register" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                    회원가입
                  </NavLink>
                </li>
                <li>
                  <span className="text-sm text-slate-400">이용약관 (준비중)</span>
                </li>
                <li>
                  <span className="text-sm text-slate-400">개인정보처리방침 (준비중)</span>
                </li>
              </ul>
            </div>

            {/* 문의 및 지원 */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">문의 및 지원</h4>
              <ul className="space-y-2">
                <li className="text-sm text-slate-500">
                  <span className="text-slate-400">이메일:</span>{' '}
                  <a href="mailto:sohae21@naver.com" className="hover:text-blue-600 transition-colors">
                    sohae21@naver.com
                  </a>
                </li>
                <li className="text-sm text-slate-400">
                  전화: (준비중)
                </li>
                <li className="text-sm text-slate-400">
                  운영시간: (준비중)
                </li>
              </ul>
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-slate-100 pt-6">
            {/* 하단 영역 - 저작권 및 개발자 정보 */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <p className="text-xs text-slate-400">
                  © 2025 GlucoseView. All rights reserved.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  본 서비스는 의료 진단이나 치료를 목적으로 하지 않습니다.
                </p>
              </div>

              <div className="text-center md:text-right">
                <p className="text-xs text-slate-500">
                  개발자: <span className="font-medium text-slate-700">서철환</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  <a href="mailto:sohae21@naver.com" className="hover:text-blue-600 transition-colors">
                    sohae21@naver.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* AI Chat Button - 로그인한 승인 사용자에게만 표시 */}
      {isAuthenticated && isApproved && (
        <AIChatButton
          userName={user?.displayName || user?.name}
          context={{
            patientCount: 0, // TODO: 실제 환자 수 연동
          }}
        />
      )}
    </div>
  );
}
