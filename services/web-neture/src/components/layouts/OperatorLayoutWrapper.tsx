/**
 * Neture OperatorLayoutWrapper
 *
 * WO-O4O-OPERATOR-UI-UNIFICATION-V1
 * admin + operator 통합 레이아웃. 역할 기반 메뉴 필터링.
 */

import { Outlet, useNavigate } from 'react-router-dom';
import { OperatorShell } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { UNIFIED_MENU, filterMenuByRole } from '../../config/operatorMenuGroups';
import AccountMenu from '../AccountMenu';

export default function OperatorLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.roles?.some(r => r === 'admin') ?? false;
  const menuItems = filterMenuByRole(UNIFIED_MENU, isAdmin);

  return (
    <OperatorShell
      serviceName="Neture"
      menuItems={menuItems}
      capabilities={ENABLED_CAPABILITIES}
      dashboardLink="/workspace/operator"
      user={user ? { name: user.name || '', email: user.email } : null}
      onLogout={() => { logout(); navigate('/'); }}
      headerActions={<AccountMenu />}
    >
      <Outlet />
    </OperatorShell>
  );
}
