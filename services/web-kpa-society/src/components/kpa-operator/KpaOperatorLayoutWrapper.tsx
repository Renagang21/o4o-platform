/**
 * KPA Society OperatorLayoutWrapper
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-RBAC-GLOBAL-STANDARD-ROLL-OUT-V1: filterMenuByRole 적용
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: renderHeader 제거, GlobalHeader 사용
 *
 * 공유 OperatorShell을 서비스 AuthContext에 연결하는 래퍼.
 * admin 역할에 따라 메뉴를 필터링하여 전달.
 * GlobalHeader(Layer A) + OperatorShell Sidebar(Layer C) 구조.
 */

import { useMemo, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { OperatorShell } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { UNIFIED_MENU, filterMenuByRole } from '../../config/operatorMenuGroups';
import { KpaGlobalHeader } from '../KpaGlobalHeader';

export default function KpaOperatorLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.roles?.some(
    (r: string) => r === 'kpa-society:admin' || r === 'platform:super_admin',
  ) ?? false;

  const menuItems = useMemo(
    () => filterMenuByRole(UNIFIED_MENU, isAdmin),
    [isAdmin],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/');
  }, [logout, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <KpaGlobalHeader />
      <OperatorShell
        serviceName="KPA Society"
        menuItems={menuItems}
        capabilities={ENABLED_CAPABILITIES}
        user={user ? { name: user.name || '', email: user.email } : null}
        onLogout={handleLogout}
        renderHeader={() => null}
      >
        <Outlet />
      </OperatorShell>
    </div>
  );
}
