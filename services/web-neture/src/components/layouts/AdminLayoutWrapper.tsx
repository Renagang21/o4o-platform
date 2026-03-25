/**
 * Neture AdminLayoutWrapper
 *
 * WO-O4O-ROLE-ROUTE-ISOLATION-V1
 * admin 전용 레이아웃. 전체 메뉴 항목을 /admin/* prefix로 표시.
 */

import { Outlet, useNavigate } from 'react-router-dom';
import { OperatorShell } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { getAdminMenu } from '../../config/operatorMenuGroups';
import AccountMenu from '../AccountMenu';

export default function AdminLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = getAdminMenu();

  return (
    <OperatorShell
      serviceName="Neture Admin"
      menuItems={menuItems}
      capabilities={ENABLED_CAPABILITIES}
      dashboardLink="/admin"
      user={user ? { name: user.name || '', email: user.email } : null}
      onLogout={() => { logout(); navigate('/'); }}
      headerActions={<AccountMenu />}
    >
      <Outlet />
    </OperatorShell>
  );
}
