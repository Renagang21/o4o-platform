/**
 * KPA Society OperatorLayoutWrapper
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-RBAC-GLOBAL-STANDARD-ROLL-OUT-V1: filterMenuByRole 적용
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: renderHeader 제거, GlobalHeader 사용
 * WO-O4O-KPA-OPERATOR-SIDEBAR-DOMAIN-IA-RESTRUCTURE-V1:
 *   OperatorShell 우회 — KPA-only KpaOperatorSidebar + 자체 layout 으로 domain IA 적용.
 *   GlobalHeader(Layer A) + KpaOperatorSidebar(Layer C) 구조.
 */

import { useMemo } from 'react';
import { isAdminOrAbove } from '@o4o/auth-utils';
import { OperatorAreaShell } from '@o4o/operator-ux-core';
import { useAuth } from '../../contexts/AuthContext';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { UNIFIED_MENU, filterMenuByRole } from '../../config/operatorMenuGroups';
import { KpaGlobalHeader } from '../KpaGlobalHeader';

export default function KpaOperatorLayoutWrapper() {
  // WO-O4O-KPA-OPERATOR-SIDEBAR-DOMAIN-IA-RESTRUCTURE-V1:
  //   logout 은 KpaGlobalHeader 가 자체 처리 — wrapper 에서는 호출하지 않음.
  const { user } = useAuth();

  // WO-O4O-OPERATOR-ROUTE-GUARD-COMMONIZATION-V1: 공통 helper 사용
  const isAdmin = user ? isAdminOrAbove(user.roles, 'kpa') : false;

  const menuItems = useMemo(
    () => filterMenuByRole(UNIFIED_MENU, isAdmin),
    [isAdmin],
  );

  return (
    <OperatorAreaShell
      header={<KpaGlobalHeader />}
      menuItems={menuItems}
      capabilities={ENABLED_CAPABILITIES}
    />
  );
}
