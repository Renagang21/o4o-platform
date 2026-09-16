/**
 * KPA Society OperatorLayoutWrapper
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-RBAC-GLOBAL-STANDARD-ROLL-OUT-V1: filterMenuByRole 적용
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: renderHeader 제거, GlobalHeader 사용
 * WO-O4O-KPA-OPERATOR-SIDEBAR-DOMAIN-IA-RESTRUCTURE-V1:
 *   OperatorShell 우회 — KPA-only KpaOperatorSidebar + 자체 layout 으로 domain IA 적용.
 *   GlobalHeader(Layer A) + KpaOperatorSidebar(Layer C) 구조.
 * WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1:
 *   표준 Service Operator IA(서비스 운영 / 사업 운영 / 운영 관리) = @o4o/operator-ux-core 기본값 —
 *   서비스 config 미주입. header 슬롯에 OperatorServiceSwitcher(1 Operator : N Services) 합성.
 */

import { useMemo } from 'react';
import { isAdminOrAbove } from '@o4o/auth-utils';
import { filterMenuByRole } from '@o4o/ui';
import { OperatorAreaShell, OperatorServiceSwitcher, createOperatorServicesApi } from '@o4o/operator-ux-core';
import { useAuth } from '../../contexts/AuthContext';
import { coreApiClient } from '../../api/client';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { UNIFIED_MENU } from '../../config/operatorMenuGroups';
import { KpaGlobalHeader } from '../KpaGlobalHeader';
import { MobileBottomNav } from '../MobileBottomNav';

// WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1: 1 Operator : N Services — 출처는
//   GET /api/v1/work-scope/operator-services 하나(/api/v1 루트 client). 2개 이상일 때만 전환 바가 그려진다.
const kpaOperatorServicesApi = createOperatorServicesApi({
  get: (url) => coreApiClient.get(url),
  post: (url, body) => coreApiClient.post(url, body),
});

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
    <>
      <OperatorAreaShell
        header={
          <>
            <KpaGlobalHeader />
            <OperatorServiceSwitcher api={kpaOperatorServicesApi} currentServiceKey="kpa-society" />
          </>
        }
        menuItems={menuItems}
        capabilities={ENABLED_CAPABILITIES}
      />
      {/* WO-O4O-KPA-MOBILE-BOTTOM-UTILITY-NAV-ROUTE-COVERAGE-FIX-V1:
          operator 영역에도 모바일 하단 utility nav(알림/내정보) 제공 + 하단 여백 확보. */}
      <div className="md:hidden" aria-hidden style={{ height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }} />
      <MobileBottomNav />
    </>
  );
}
