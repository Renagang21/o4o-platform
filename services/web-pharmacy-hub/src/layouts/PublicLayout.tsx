/**
 * PublicLayout — Pharmacy-Hub 공개 영역 셸
 *
 * WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1
 *
 * K-Cosmetics MainLayout / Neture MainLayout 과 같은 구조:
 *   공통 GlobalHeader(브릿지) + <Outlet/> + 공개 푸터.
 *
 * 적용 범위 (App.tsx):
 *   / · /login · /join · /join/status · /forum/* · catch-all(404)
 *
 * 비적용 (기존 계약 유지 — 의도적):
 *   - /store-owner/* · /store-hub · /operator/*
 *     → 각 역할 업무 셸이 자체 상단바를 갖는다. 여기 헤더를 얹으면 이중 헤더가 된다.
 *   - /qr/:slug → 소비자가 스캔하는 공개 랜딩. 서비스 내비게이션을 노출하지 않는 계약이다.
 */

import { Outlet } from 'react-router-dom';
import { PharmacyHubGlobalHeader } from '../components/PharmacyHubGlobalHeader';
import Footer from '../components/Footer';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PharmacyHubGlobalHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
