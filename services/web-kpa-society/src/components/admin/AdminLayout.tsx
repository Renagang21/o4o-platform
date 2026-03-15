/**
 * AdminLayout - 지부 관리자 레이아웃
 *
 * WO-O4O-ADMIN-DASHBOARD-REFINE-V1:
 * - inline style → Tailwind 전환
 */

import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 ml-[260px] min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
