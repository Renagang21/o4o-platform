/**
 * MainLayout - GlycoPharm 메인 레이아웃
 * GlobalHeader + Content + Footer + MobileBottomNav
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Header → GlycoGlobalHeader 교체
 * WO-O4O-GLYCOPHARM-MENU-CANONICAL-ALIGN-V1: MobileBottomNav 추가
 */

import { Outlet } from 'react-router-dom';
import { GlycoGlobalHeader } from '@/components/GlycoGlobalHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import Footer from '@/components/common/Footer';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <GlycoGlobalHeader />
      {/* 모바일 하단 네비게이션 높이(56px)만큼 하단 여백 확보 */}
      <main className="flex-1 pb-14 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
