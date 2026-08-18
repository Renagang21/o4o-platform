/**
 * NetureLayout - Neture 플랫폼 메인 레이아웃
 *
 * WO-O4O-NETURE-UI-REFACTORING-V1
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Header → NetureGlobalHeader 교체
 *
 * 스코프: /, /about, /forum, /notices, /contact
 */

import { Link, Outlet } from 'react-router-dom';
import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { NetureGlobalHeader } from '../NetureGlobalHeader';
import { NetureBottomNav } from '../NetureBottomNav';
// WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1
import { loadFooterLegal } from '../../lib/footerLegal';

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
              {/* WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1: 하드코딩 법정정보 제거 → API 값 있을 때만 표시 */}
              <div className="text-xs text-gray-400 mt-1">
                <PublicLegalFooterInfo serviceKey="neture" loadProfile={loadFooterLegal} />
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              {/* WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1: dead link /about 제거 (route 없음, About 페이지 부재) */}
              <Link to="/contact" className="hover:text-primary-600 transition-colors">
                Contact Us
              </Link>
              {/* WO-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1:
                  /terms · /privacy 는 route 가 존재한다(공통 PolicyDocumentViewer). 다른 서비스
                  푸터와 같은 축으로 노출한다 — route 있는 실기능을 숨기지 않는다. */}
              <Link to="/terms" className="hover:text-primary-600 transition-colors">
                이용약관
              </Link>
              <Link to="/privacy" className="hover:text-primary-600 transition-colors">
                개인정보처리방침
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* WO-O4O-NETURE-MOBILE-NAV-...-V1: 모바일 하단 utility nav(알림/내정보). 비인증 시 미렌더. */}
      <NetureBottomNav />
    </div>
  );
}
