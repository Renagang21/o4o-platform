/**
 * MainLayout
 *
 * 사용자 페이지용 메인 레이아웃
 * - 상단 네비게이션
 * - 사이드바 (선택)
 * - 푸터
 */

import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, useOrganization } from '@/context';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { organization } = useOrganization();

  // 현재 경로 체크
  const isActive = (path: string): boolean => {
    return location.pathname.startsWith(path);
  };

  // 네비게이션 아이템
  const navItems = [
    { label: '홈', path: '/', icon: '🏠' },
    { label: '커뮤니티', path: '/forum', icon: '💬' },
    { label: '공동구매', path: '/groupbuy', icon: '🛒' },
    { label: '내 학습', path: '/lms', icon: '📚' },
  ];

  // 로그아웃 처리
  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await logout();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* 로고 */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">💊</span>
              <span className="text-lg font-bold text-gray-900">약사회</span>
            </Link>

            {/* 네비게이션 */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive(item.path) && item.path !== '/'
                      ? 'bg-blue-50 text-blue-600'
                      : item.path === '/' && location.pathname === '/'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* 사용자 메뉴 */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  {/* 조직 표시 */}
                  {organization && (
                    <span className="hidden sm:inline-block text-sm text-gray-500">
                      {organization.name}
                    </span>
                  )}

                  {/* 사용자 드롭다운 */}
                  <div className="relative group">
                    <button
                      type="button"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {(user?.name || user?.email || 'U')[0]}
                        </span>
                      </div>
                      <span className="hidden sm:inline text-sm font-medium text-gray-700">
                        {user?.name || user?.email}
                      </span>
                    </button>

                    {/* 드롭다운 메뉴 */}
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="py-1">
                        <Link
                          to="/mypage"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          마이페이지
                        </Link>
                        <Link
                          to="/mypage/settings"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          설정
                        </Link>
                        <hr className="my-1" />
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          로그아웃
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 모바일 네비게이션 */}
        <nav className="md:hidden border-t border-gray-200">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs transition-colors
                  ${isActive(item.path) && item.path !== '/'
                    ? 'text-blue-600'
                    : item.path === '/' && location.pathname === '/'
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1">{children}</main>

      {/* 푸터 */}
      <footer className="bg-gray-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">💊</span>
                <span className="text-lg font-bold">약사회</span>
              </div>
              <p className="text-sm text-gray-400">
                약사 회원을 위한 커뮤니티 플랫폼
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3">서비스</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/forum" className="hover:text-white">커뮤니티</Link></li>
                <li><Link to="/groupbuy" className="hover:text-white">공동구매</Link></li>
                <li><Link to="/lms" className="hover:text-white">교육</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">지원</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/help" className="hover:text-white">도움말</Link></li>
                <li><Link to="/faq" className="hover:text-white">자주 묻는 질문</Link></li>
                <li><Link to="/contact" className="hover:text-white">문의하기</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">정책</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/terms" className="hover:text-white">이용약관</Link></li>
                <li><Link to="/privacy" className="hover:text-white">개인정보처리방침</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-sm text-gray-400 text-center">
            © 2024 약사회. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
