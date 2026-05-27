/**
 * Neture AdminLayoutWrapper
 *
 * WO-O4O-ROLE-ROUTE-ISOLATION-V1
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: GlobalHeader 추가, OperatorShell 헤더 제거
 * WO-O4O-NETURE-ADMIN-DASHBOARD-ACTUAL-STRUCTURE-FIX-V1:
 *   admin sidebar 가 operator 메뉴 superset 으로 보이던 문제 해소 — getAdminMenu()
 *   재설계로 admin 전용 항목 + 운영자 업무 바로가기 1개만 표시. serviceName 도
 *   "Neture 관리자" 로 명시.
 *
 * admin 전용 레이아웃. GlobalHeader(Layer A) + OperatorShell Sidebar(Layer C) 구조.
 */

import { Outlet, useNavigate } from 'react-router-dom';
import { OperatorShell } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { getAdminMenu } from '../../config/operatorMenuGroups';
import { NetureGlobalHeader } from '../NetureGlobalHeader';

export default function AdminLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = getAdminMenu();

  return (
    <div className="min-h-screen flex flex-col">
      <NetureGlobalHeader />
      <OperatorShell
        serviceName="Neture 관리자"
        menuItems={menuItems}
        capabilities={ENABLED_CAPABILITIES}
        dashboardLink="/admin"
        user={user ? { name: user.name || '', email: user.email } : null}
        onLogout={() => { logout(); navigate('/'); }}
        renderHeader={() => null}
        sidebarTopOffset="top-20"
      >
        <Outlet />
      </OperatorShell>
    </div>
  );
}
