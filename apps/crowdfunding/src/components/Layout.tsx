import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, User, Menu } from 'lucide-react';
import { useState } from 'react';
// import { useAuth } from '@o4o/auth-context';
// 임시: auth-context 빌드 문제로 인한 mock
const useAuth = () => ({
  user: null as { name?: string; email?: string } | null,
  isAuthenticated: false
});

export function Layout() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border-main">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">O4O</span>
              </div>
              <span className="text-xl font-semibold text-text-main">크라우드펀딩</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                to="/projects"
                className={`flex items-center space-x-2 text-sm font-medium transition-colors ${
                  isActive('/projects') ? 'text-primary' : 'text-text-secondary hover:text-text-main'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>프로젝트 둘러보기</span>
              </Link>
              
              <Link
                to="/create"
                className={`flex items-center space-x-2 text-sm font-medium transition-colors ${
                  isActive('/create') ? 'text-primary' : 'text-text-secondary hover:text-text-main'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>프로젝트 만들기</span>
              </Link>

              {isAuthenticated && (
                <Link
                  to="/dashboard/backer"
                  className={`flex items-center space-x-2 text-sm font-medium transition-colors ${
                    isActive('/dashboard') ? 'text-primary' : 'text-text-secondary hover:text-text-main'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>내 대시보드</span>
                </Link>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-text-secondary hidden md:block">
                    {user?.name || user?.email}
                  </span>
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  로그인
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-text-secondary hover:text-text-main"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border-main">
            <nav className="container mx-auto px-4 py-4 space-y-4">
              <Link
                to="/projects"
                className="block text-sm font-medium text-text-secondary hover:text-text-main"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                프로젝트 둘러보기
              </Link>
              <Link
                to="/create"
                className="block text-sm font-medium text-text-secondary hover:text-text-main"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                프로젝트 만들기
              </Link>
              {isAuthenticated && (
                <Link
                  to="/dashboard/backer"
                  className="block text-sm font-medium text-text-secondary hover:text-text-main"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  내 대시보드
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-border-main mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-text-secondary">
            © 2024 O4O Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}