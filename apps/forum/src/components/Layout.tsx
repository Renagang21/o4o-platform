import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@o4o/auth-context';
import { 
  Home, 
  Layers, 
  FileText, 
  Search, 
  Tag, 
  Bookmark, 
  User,
  LogIn,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@o4o/utils';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: '홈', href: '/', icon: Home },
    { name: '카테고리', href: '/categories', icon: Layers },
    { name: '게시글', href: '/posts', icon: FileText },
    { name: '태그', href: '/tags', icon: Tag },
    { name: '검색', href: '/search', icon: Search },
  ];

  const userNavigation = [
    { name: '내 게시글', href: '/my-posts', icon: FileText },
    { name: '북마크', href: '/my-bookmarks', icon: Bookmark },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || 
           (path !== '/' && location.pathname.startsWith(path));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Main Nav */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <h1 className="text-xl font-bold text-primary-600">O4O Forum</h1>
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex ml-10 space-x-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      'flex items-center gap-2',
                      isActive(item.href)
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  {/* Desktop User Menu */}
                  <div className="hidden md:flex items-center gap-4">
                    {userNavigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          'flex items-center gap-2',
                          isActive(item.href)
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.name}
                      </Link>
                    ))}
                    
                    <div className="flex items-center gap-3 ml-4 pl-4 border-l">
                      <span className="text-sm text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {user.name || user.email}
                      </span>
                      <button
                        onClick={() => logout()}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <LogOut className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Write Post Button */}
                  <Link
                    to="/posts/new"
                    className="btn btn-primary btn-sm"
                  >
                    글쓰기
                  </Link>
                </>
              ) : (
                <a
                  href="/login"
                  className="btn btn-primary btn-sm flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  로그인
                </a>
              )}

              {/* Mobile menu button */}
              <button
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t">
            <nav className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-3 py-2 rounded-md text-base font-medium',
                    'flex items-center gap-2',
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              
              {user && (
                <>
                  <div className="border-t pt-2 mt-2">
                    {userNavigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'block px-3 py-2 rounded-md text-base font-medium',
                          'flex items-center gap-2',
                          isActive(item.href)
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                  
                  <div className="border-t pt-2 mt-2">
                    <div className="px-3 py-2 text-sm text-gray-700">
                      {user.name || user.email}
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2"
                    >
                      <LogOut className="w-5 h-5" />
                      로그아웃
                    </button>
                  </div>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            © 2025 O4O Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;