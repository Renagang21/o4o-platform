/**
 * PatientLayout — 당뇨인 서비스 레이아웃
 * WO-GLUCOSEVIEW-PATIENT-MOBILE-UX-V1
 *
 * Outlet + MobileBottomNav 래퍼.
 * pb-20으로 하단 nav 겹침 방지 (md 이상에서는 제거).
 */

import { Outlet } from 'react-router-dom';
import MobileBottomNav from '../mobile/MobileBottomNav';

export default function PatientLayout() {
  return (
    <div className="min-h-screen bg-white">
      <main className="pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
}
