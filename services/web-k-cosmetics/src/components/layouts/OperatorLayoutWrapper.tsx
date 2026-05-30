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
import { Outlet } from 'react-router-dom';
import { isAdminOrAbove } from '@o4o/auth-utils';
import { useAuth } from '../../contexts/AuthContext';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { UNIFIED_MENU, filterMenuByRole } from '../../config/operatorMenuGroups';
import { DomainIASidebar } from '@o4o/operator-ux-core';
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <KCosGlobalHeader />
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <DomainIASidebar
            menuItems={menuItems}
            capabilities={ENABLED_CAPABILITIES}
            sidebarTopOffset="top-20"
          />
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
