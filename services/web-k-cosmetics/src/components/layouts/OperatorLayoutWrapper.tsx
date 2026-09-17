/**
 * K-Cosmetics OperatorLayoutWrapper
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-AUTH-RBAC-CLEANUP-V1: filterMenuByRole 적용
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: GlobalHeader 추가, OperatorShell 헤더 제거
 * WO-O4O-KCOS-OPERATOR-MENU-ALIGN-WITH-KPA-V1:
 *   OperatorShell 우회 — K-Cosmetics-only KCosOperatorSidebar + 자체 layout 으로
 *   KPA-Society 와 동일한 domain IA (커뮤니티 운영 / 매장 HUB 운영 / 운영 공통) 적용.
 *   KCosGlobalHeader(Layer A) + KCosOperatorSidebar(Layer C) 구조.
 *   logout 은 KCosGlobalHeader 가 자체 처리 — wrapper 에서는 호출하지 않음.
 * WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1:
 *   표준 Service Operator IA(서비스 운영 / 사업 운영 / 운영 관리) = @o4o/operator-ux-core 기본값 —
 *   서비스 config 미주입. header 슬롯에 OperatorServiceSwitcher(1 Operator : N Services) 합성.
 */

import { useMemo } from 'react';
import { isAdminOrAbove } from '@o4o/auth-utils';
import { filterMenuByRole } from '@o4o/ui';
import { OperatorAreaShell, OperatorServiceSwitcher, createOperatorServicesApi } from '@o4o/operator-ux-core';
import { useAuth } from '../../contexts/AuthContext';
import { api as coreApi } from '../../lib/apiClient';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { UNIFIED_MENU } from '../../config/operatorMenuGroups';
import { KCosGlobalHeader } from '../KCosGlobalHeader';

// WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1: 1 Operator : N Services — 출처는
//   GET /api/v1/work-scope/operator-services 하나(/api/v1 루트 axios, envelope 는 .data 로 unwrap).
const kcosOperatorServicesApi = createOperatorServicesApi({
  get: async (url) => (await coreApi.get(url)).data,
  post: async (url, body) => (await coreApi.post(url, body)).data,
});

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
      header={
        <>
          <KCosGlobalHeader />
          <OperatorServiceSwitcher api={kcosOperatorServicesApi} currentServiceKey="k-cosmetics" />
        </>
      }
      menuItems={menuItems}
      capabilities={ENABLED_CAPABILITIES}
    />
  );
}
