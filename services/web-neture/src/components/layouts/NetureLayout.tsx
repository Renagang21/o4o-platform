/**
 * NetureLayout - Neture 플랫폼 메인 레이아웃
 *
 * WO-O4O-NETURE-UI-REFACTORING-V1
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Header → NetureGlobalHeader 교체
 *
 * 스코프: /, /about, /community, /contact
 */

import { Link, Outlet } from 'react-router-dom';
import { NetureGlobalHeader } from '../NetureGlobalHeader';

export default function NetureLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NetureGlobalHeader />

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
