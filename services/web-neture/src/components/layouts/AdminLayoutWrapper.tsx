/**
 * Neture AdminLayoutWrapper
 *
 * WO-O4O-ROLE-ROUTE-ISOLATION-V1
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: GlobalHeader 추가, OperatorShell 헤더 제거
 *
 * admin 전용 레이아웃. 전체 메뉴 항목을 /admin/* prefix로 표시.
 * GlobalHeader(Layer A) + OperatorShell Sidebar(Layer C) 구조.
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
        serviceName="Neture Admin"
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
