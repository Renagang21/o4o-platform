import { ServiceFooter } from '@o4o/auth-react';
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
import { CURRENT_HOST_PROFILE } from '../../lib/hostProfile';
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
      <ServiceFooter brand={CURRENT_HOST_PROFILE === 'carepharm' ? 'CarePharm · 만성질환관리' : 'Neture · O4O 통합 업무 공간'} links={<><Link to="/contact">Contact Us</Link><Link to="/terms">이용약관</Link><Link to="/privacy">개인정보처리방침</Link></>}><PublicLegalFooterInfo serviceKey={CURRENT_HOST_PROFILE === 'carepharm' ? 'carepharm' : 'neture'} loadProfile={loadFooterLegal} /></ServiceFooter>

      {/* WO-O4O-NETURE-MOBILE-NAV-...-V1: 모바일 하단 utility nav(알림/내정보). 비인증 시 미렌더. */}
      <NetureBottomNav />
    </div>
  );
}
