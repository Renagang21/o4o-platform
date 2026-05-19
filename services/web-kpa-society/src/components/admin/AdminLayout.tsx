/**
 * AdminLayout - 지부 관리자 레이아웃
 *
 * WO-O4O-ADMIN-DASHBOARD-REFINE-V1:
 * - inline style → Tailwind 전환
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1:
 * - GlobalHeader 추가 (Layer A)
 * - AdminSidebar 유지 (Layer C)
 * WO-O4O-KPA-ADMIN-LAYOUT-MOBILE-FIX-V1:
 * - 데스크톱 고정 `ml-[260px]` → `md:ml-[260px]`로 한정 (mobile 본문 잘림 해소)
 * - mobile에서는 sidebar drawer 패턴 + 햄버거 토글 바 제공
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { KpaGlobalHeader } from '../KpaGlobalHeader';

export function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <KpaGlobalHeader />

      {/* Mobile-only sidebar toggle bar — desktop 숨김. 헤더 바로 아래에 sticky로 배치. */}
      <div className="md:hidden sticky top-16 z-20 bg-white border-b border-gray-200 px-4 py-2 flex items-center">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="관리자 메뉴 열기"
          aria-expanded={mobileSidebarOpen}
          aria-controls="admin-sidebar"
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
        >
          <Menu className="w-5 h-5" />
          메뉴
        </button>
      </div>

      <div className="flex flex-1">
        <AdminSidebar
          isMobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <main className="flex-1 md:ml-[260px] min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
