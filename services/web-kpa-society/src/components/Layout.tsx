/**
 * Layout - KPA Society 메인 레이아웃
 * GlobalHeader + Content + Footer + MobileBottomNav
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Header → KpaGlobalHeader 교체
 * WO-O4O-KPA-MOBILE-MENU-STRUCTURE-PHASE2-V1: MobileBottomNav 추가
 */

import type { ReactNode } from 'react';
import { KpaGlobalHeader } from './KpaGlobalHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { Footer } from './Footer';

interface LayoutProps {
  serviceName: string;
  children: ReactNode;
}

export function Layout({ serviceName: _serviceName, children }: LayoutProps) {
  return (
    <div style={styles.container}>
      <KpaGlobalHeader />
      {/* 모바일 하단 네비게이션 높이(56px)만큼 하단 여백 확보 */}
      <main style={styles.main} className="pb-14 md:pb-0">{children}</main>
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
  },
  main: {
    flex: 1,
  },
};
