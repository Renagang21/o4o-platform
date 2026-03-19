/**
 * Neture OperatorLayoutWrapper
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * 공유 OperatorShell을 서비스 AuthContext에 연결하는 래퍼.
 */

import { Outlet, useNavigate } from 'react-router-dom';
import { OperatorShell } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { OPERATOR_MENU_ITEMS } from '../../config/operatorMenuGroups';
import AccountMenu from '../AccountMenu';

export default function OperatorLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <OperatorShell
      serviceName="Neture"
      menuItems={OPERATOR_MENU_ITEMS}
      capabilities={ENABLED_CAPABILITIES}
      user={user ? { name: user.name || '', email: user.email } : null}
      onLogout={() => { logout(); navigate('/'); }}
      headerActions={<AccountMenu />}
    >
      <Outlet />
    </OperatorShell>
  );
}
