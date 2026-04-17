/**
 * AdminLayout - 지부 관리자 레이아웃
 *
 * WO-O4O-ADMIN-DASHBOARD-REFINE-V1:
 * - inline style → Tailwind 전환
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1:
 * - GlobalHeader 추가 (Layer A)
 * - AdminSidebar 유지 (Layer C)
 */

import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { KpaGlobalHeader } from '../KpaGlobalHeader';

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <KpaGlobalHeader />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 ml-[260px] min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
