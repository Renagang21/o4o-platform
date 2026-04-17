/**
 * MainLayout - o4o 공통 영역 레이아웃
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Header → NetureGlobalHeader 교체
 *
 * 스코프:
 * - /, /o4o, /channel/*, /seller/overview/*, /partner/overview-info
 * - /test-center, /test-guide (다중 서비스)
 */

import { Link, Outlet } from 'react-router-dom';
import { NetureGlobalHeader } from '../NetureGlobalHeader';

export default function MainLayout() {
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
              <p>&copy; 2026 ㈜쓰리라이프존 | 사업자등록번호 108-86-02873</p>
              <p className="text-xs text-gray-400 mt-1">고객센터 1577-2779 | sohae2100@gmail.com</p>
            </div>
            <Link to="/forum" className="text-xs text-green-600 hover:text-green-700 transition-colors">
              포럼
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
