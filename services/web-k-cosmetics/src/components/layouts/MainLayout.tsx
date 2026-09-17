/**
 * MainLayout - K-Cosmetics
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Header → KCosGlobalHeader 교체
 * WO-O4O-KCOS-MENU-CANONICAL-ALIGN-V1: MobileBottomNav 추가
 * WO-O4O-KPA-KCOS-MOBILE-FOOTER-BOTTOM-NAV-OCCLUSION-FIX-V1:
 *   Footer 뒤에 공통 MobileBottomNavSpacer 추가 — fixed nav 가 Footer 법정정보를 가리지 않게 한다.
 */

import { Outlet } from 'react-router-dom';
import { MobileBottomNavSpacer } from '@o4o/account-ui';
import { KCosGlobalHeader } from '@/components/KCosGlobalHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Footer } from '@/components/common';

export default function MainLayout() {
  return (
    <div style={styles.container}>
      <KCosGlobalHeader />
      {/* 모바일 하단 네비게이션 높이(56px)만큼 하단 여백 확보 */}
      <main style={styles.main} className="pb-14 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      {/* fixed MobileBottomNav 높이만큼 문서 흐름 여백 — Footer 마지막 줄 가림 방지 */}
      <MobileBottomNavSpacer />
      <MobileBottomNav />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8fafc',
  },
  main: {
    flex: 1,
  },
};
