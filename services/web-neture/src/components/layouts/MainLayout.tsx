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
import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { NetureGlobalHeader } from '../NetureGlobalHeader';
// WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1
import { loadFooterLegal } from '../../lib/footerLegal';

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
              <p>&copy; 2026 Neture. 공급자 · 파트너 협업 플랫폼</p>
              {/* WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1: 하드코딩 법정정보 제거 → API 값 있을 때만 표시 */}
              <div className="text-xs text-gray-400 mt-1">
                <PublicLegalFooterInfo serviceKey="neture" loadProfile={loadFooterLegal} />
              </div>
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
