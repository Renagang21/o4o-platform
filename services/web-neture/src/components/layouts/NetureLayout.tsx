/**
 * NetureLayout - Neture 플랫폼 메인 레이아웃
 *
 * Work Order: WO-O4O-NETURE-UI-REFACTORING-V1
 *
 * Header 메뉴: Home | Supplier | Partner | Community | Contact Us | About | Login
 * 스코프: /, /about, /community, /contact
 */

import { Link, Outlet, useLocation } from 'react-router-dom';
import AccountMenu from '../AccountMenu';

export default function NetureLayout() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navLinkClass = (path: string) =>
    `px-3 py-2 text-sm font-medium transition-colors ${
      isActive(path)
        ? 'text-primary-600'
        : 'text-gray-700 hover:text-primary-600'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary-600">Neture</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link to="/" className={navLinkClass('/')}>
                Home
              </Link>
              <Link to="/community" className={navLinkClass('/community')}>
                Community
              </Link>
              <Link to="/supplier" className={navLinkClass('/supplier')}>
                Supplier
              </Link>
              <Link to="/partner" className={navLinkClass('/partner')}>
                Partner
              </Link>
              <Link to="/contact" className={navLinkClass('/contact')}>
                Contact Us
              </Link>
              <Link to="/about" className={navLinkClass('/about')}>
                About
              </Link>
            </nav>

            {/* Account */}
            <div className="flex items-center">
              <AccountMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="text-center sm:text-left">
              <p>&copy; 2026 Neture. 공급자 &middot; 파트너 협업 플랫폼</p>
              <p className="text-xs text-gray-400 mt-1">
                ㈜쓰리라이프존 | 사업자등록번호 108-86-02873 | 고객센터 1577-2779
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <Link to="/contact" className="hover:text-primary-600 transition-colors">
                Contact Us
              </Link>
              <Link to="/about" className="hover:text-primary-600 transition-colors">
                About
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
