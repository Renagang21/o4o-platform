/**
 * MainLayout - K-Cosmetics
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Header → KCosGlobalHeader 교체
 * WO-O4O-KCOS-MENU-CANONICAL-ALIGN-V1: MobileBottomNav 추가
 */

import { Outlet } from 'react-router-dom';
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
