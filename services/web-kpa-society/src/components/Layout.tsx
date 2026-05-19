/**
 * Layout - KPA Society 메인 레이아웃
 * GlobalHeader + Content + Footer + MobileBottomNav
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Header → KpaGlobalHeader 교체
 * WO-O4O-KPA-MOBILE-MENU-STRUCTURE-PHASE2-V1: MobileBottomNav 추가
 * WO-O4O-RESPONSIVE-PRIMITIVES-AND-SAFE-AREA-V1:
 *   `pb-14` 고정값 → MobileSafeArea로 교체.
 *   iOS home-indicator(`env(safe-area-inset-bottom)`)까지 반영.
 */

import type { ReactNode } from 'react';
import { MobileSafeArea } from '@o4o/ui';
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
      {/*
        모바일 하단 네비게이션(56px) + iOS safe-area-inset-bottom 보정.
        md 이상에서는 padding 0 (bottom nav 없음).
      */}
      <MobileSafeArea as="main" style={styles.main}>
        {children}
      </MobileSafeArea>
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
