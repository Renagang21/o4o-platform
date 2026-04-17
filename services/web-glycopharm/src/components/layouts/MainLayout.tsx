/**
 * MainLayout - GlycoPharm 메인 레이아웃
 * GlobalHeader + Content + Footer
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Header → GlycoGlobalHeader 교체
 */

import { Outlet } from 'react-router-dom';
import { GlycoGlobalHeader } from '@/components/GlycoGlobalHeader';
import Footer from '@/components/common/Footer';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <GlycoGlobalHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
