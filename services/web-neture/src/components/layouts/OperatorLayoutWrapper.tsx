/**
 * Neture OperatorLayoutWrapper
 *
 * WO-O4O-ROLE-ROUTE-ISOLATION-V1
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: GlobalHeader 추가, OperatorShell 헤더 제거
 *
 * operator 전용 레이아웃. adminOnly 항목 제외.
 * GlobalHeader(Layer A) + OperatorShell Sidebar(Layer C) 구조.
 */

import { Outlet, useNavigate } from 'react-router-dom';
import { OperatorShell } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { UNIFIED_MENU, filterMenuByRole } from '../../config/operatorMenuGroups';
import { NetureGlobalHeader } from '../NetureGlobalHeader';

export default function OperatorLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = filterMenuByRole(UNIFIED_MENU, false);

  return (
    <div className="min-h-screen flex flex-col">
      <NetureGlobalHeader />
      <OperatorShell
        serviceName="Neture"
        menuItems={menuItems}
        capabilities={ENABLED_CAPABILITIES}
        dashboardLink="/operator"
        user={user ? { name: user.name || '', email: user.email } : null}
        onLogout={() => { logout(); navigate('/'); }}
        renderHeader={() => null}
      >
        <Outlet />
      </OperatorShell>
    </div>
  );
}
