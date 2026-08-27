/**
 * GlycoPharm OperatorLayoutWrapper
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-RBAC-GLOBAL-STANDARD-ROLL-OUT-V1: filterMenuByRole 적용
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: renderHeader 제거, GlobalHeader 사용
 * WO-O4O-GLYCOPHARM-OPERATOR-MENU-ALIGN-WITH-KPA-V1:
 *   OperatorShell 우회 — GlycoPharm-only GlycoOperatorSidebar + 자체 layout 으로
 *   KPA-Society 와 동일한 domain IA (커뮤니티 운영 / 매장 HUB 운영 / 운영 공통) 적용.
 *   GlycoGlobalHeader(Layer A) + GlycoOperatorSidebar(Layer C) 구조.
 *   logout 은 GlycoGlobalHeader 가 자체 처리 — wrapper 에서는 호출하지 않음.
 */

import { useMemo } from 'react';
import { isAdminOrAbove } from '@o4o/auth-utils';
import { filterMenuByRole } from '@o4o/ui';
import { OperatorAreaShell } from '@o4o/operator-ux-core';
import { useAuth } from '../../contexts/AuthContext';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { UNIFIED_MENU } from '../../config/operatorMenuGroups';
import { hasPlatformAdminRole } from '../../lib/role-constants';
import { GlycoGlobalHeader } from '../GlycoGlobalHeader';

export default function OperatorLayoutWrapper() {
  const { user } = useAuth();

  // WO-O4O-OPERATOR-ROUTE-GUARD-COMMONIZATION-V1: 공통 helper 사용
  const isAdmin = user ? isAdminOrAbove(user.roles, 'glycopharm') : false;

  // WO-O4O-GLYCOPHARM-AI-ADMIN-ROLE-GUARD-CONTRACT-AUDIT-AND-CLOSURE-V1:
  //   platformOnly 항목(플랫폼 전역 AI 화면) 노출 판정. glycopharm:admin 단독은 false.
  const isPlatformAdmin = hasPlatformAdminRole(user?.roles);

  const menuItems = useMemo(
    () => filterMenuByRole(UNIFIED_MENU, isAdmin, isPlatformAdmin),
    [isAdmin, isPlatformAdmin],
  );

  return (
    <OperatorAreaShell
      header={<GlycoGlobalHeader />}
      menuItems={menuItems}
      capabilities={ENABLED_CAPABILITIES}
    />
  );
}
