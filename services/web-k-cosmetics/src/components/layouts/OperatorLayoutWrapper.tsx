/**
 * K-Cosmetics OperatorLayoutWrapper
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-AUTH-RBAC-CLEANUP-V1: filterMenuByRole 적용
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: GlobalHeader 추가, OperatorShell 헤더 제거
 *
 * 공유 OperatorShell을 서비스 AuthContext에 연결하는 래퍼.
 * admin 역할에 따라 메뉴를 필터링하여 전달.
 * GlobalHeader(Layer A) + OperatorShell Sidebar(Layer C) 구조.
 */

import { useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { OperatorShell } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { UNIFIED_MENU, filterMenuByRole } from '../../config/operatorMenuGroups';
import { KCosGlobalHeader } from '../KCosGlobalHeader';

export default function OperatorLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.roles?.some(
    (r: string) => r === 'k-cosmetics:admin' || r === 'platform:super_admin',
  ) ?? false;

  const menuItems = useMemo(
    () => filterMenuByRole(UNIFIED_MENU, isAdmin),
    [isAdmin],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <KCosGlobalHeader />
      <OperatorShell
        serviceName="K-Cosmetics"
        menuItems={menuItems}
        capabilities={ENABLED_CAPABILITIES}
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
