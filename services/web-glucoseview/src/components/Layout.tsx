import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';
import { AIChatButton } from './ai';

const navItems = [
  { path: '/', label: 'Home', protected: false },
  { path: '/patients', label: 'Patients', protected: true },
  { path: '/insights', label: 'Insights', protected: true },
  { path: '/about', label: 'About', protected: false },
];

export default function Layout() {
  const { user, logout, isAuthenticated, isApproved, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if (item.protected && (!isAuthenticated || !isApproved)) {
      e.preventDefault();
      setShowLoginModal(true);
    }
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

              {/* Admin Link - 관리자만 표시 */}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-red-100 text-red-700'
                        : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                    }`
                  }
                >
                  Admin
                </NavLink>
              )}

              {/* User Icon & Dropdown OR Login Button */}
              <div className="ml-4 pl-4 border-l border-slate-200 flex items-center">
                {isAuthenticated ? (
                  <div className="relative" ref={userMenuRef}>
                    {/* 사용자 아이콘 버튼 */}
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="w-9 h-9 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors"
                      title={user?.displayName || user?.name}
                    >
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </button>

                    {/* 드롭다운 메뉴 */}
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                        {/* 사용자 정보 */}
                        <div className="px-4 py-3 border-b border-slate-100">
                          <p className="text-sm font-medium text-slate-900">{user?.displayName || user?.name}</p>
                          <p className="text-xs text-slate-500">{user?.email}</p>
                          {user?.pharmacyName && (
                            <p className="text-xs text-slate-400 mt-1">{user.pharmacyName}</p>
                          )}
                        </div>

                        {/* 메뉴 항목 */}
                        <div className="py-1">
                          <NavLink
                            to="/mypage"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            마이페이지
                          </NavLink>
                          <NavLink
                            to="/settings"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            설정
                          </NavLink>
                        </div>

                        {/* 로그아웃 */}
                        <div className="border-t border-slate-100 pt-1 mt-1">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            로그아웃
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
