/**
 * K-Cosmetics OperatorLayoutWrapper
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-AUTH-RBAC-CLEANUP-V1: filterMenuByRole 적용
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: GlobalHeader 추가, OperatorShell 헤더 제거
 * WO-O4O-KCOS-OPERATOR-MENU-ALIGN-WITH-KPA-V1:
 *   OperatorShell 우회 — K-Cosmetics-only KCosOperatorSidebar + 자체 layout 으로
 *   KPA-Society / GlycoPharm 와 동일한 domain IA (커뮤니티 운영 / 매장 HUB 운영 / 운영 공통) 적용.
 *   KCosGlobalHeader(Layer A) + KCosOperatorSidebar(Layer C) 구조.
 *   logout 은 KCosGlobalHeader 가 자체 처리 — wrapper 에서는 호출하지 않음.
 */

import { useMemo } from 'react';
import { isAdminOrAbove } from '@o4o/auth-utils';
import { OperatorAreaShell } from '@o4o/operator-ux-core';
import { useAuth } from '../../contexts/AuthContext';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { UNIFIED_MENU, filterMenuByRole } from '../../config/operatorMenuGroups';
import { KCosGlobalHeader } from '../KCosGlobalHeader';

export default function OperatorLayoutWrapper() {
  const { user } = useAuth();

  // WO-O4O-OPERATOR-ROUTE-GUARD-COMMONIZATION-V1: 공통 helper 사용
  const isAdmin = user ? isAdminOrAbove(user.roles, 'cosmetics') : false;

  const menuItems = useMemo(
    () => filterMenuByRole(UNIFIED_MENU, isAdmin),
    [isAdmin],
  );

  return (
    <OperatorAreaShell
      header={<KCosGlobalHeader />}
      menuItems={menuItems}
      capabilities={ENABLED_CAPABILITIES}
    />
  );
}
