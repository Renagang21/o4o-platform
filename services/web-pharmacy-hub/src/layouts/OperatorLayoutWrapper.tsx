/**
 * OperatorLayoutWrapper — Pharmacy-Hub 운영자 영역 셸 wrapper
 *
 * WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1
 *
 * KPA-Society / K-Cosmetics / GlycoPharm 와 동일한 공통 구조로 편입한다:
 *   OperatorAreaShell(@o4o/operator-ux-core) + DomainIASidebar + 서비스별 menu/header/config.
 * Pharmacy-Hub 전용 Layout·Sidebar 사본을 만들지 않는다.
 *
 * 가드는 기존과 동일하게 MembershipGate (service_memberships.status 축) 를 유지한다.
 * 셸 채택은 UX 편입이며 권한 경계를 바꾸지 않는다 — 실제 경계는 backend
 * pharmacy-hub:operator scope guard 가 강제한다.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { isAdminOrAbove } from '@o4o/auth-utils';
import { filterMenuByRole } from '@o4o/ui';
import { OperatorAreaShell } from '@o4o/operator-ux-core';
import { useAuth } from '../contexts/AuthContext';
import { MembershipGate } from '../components/MembershipGate';
import { OperatorHeader } from '../components/operator/OperatorHeader';
import { ENABLED_CAPABILITIES } from '../config/operatorCapabilities';
import { UNIFIED_MENU, PHARMACY_HUB_OPERATOR_DOMAIN_IA } from '../config/operatorMenuGroups';
import { ROLES, SERVICE_KEY, satisfiesRole } from '../config/service';

/**
 * WO-O4O-CROSSSERVICE-ADMIN-OPERATOR-ROLE-ENTRY-FINAL-CLOSURE-V1
 *
 * 운영자 역할이 없는 사용자(예: store_owner)가 `/operator` 로 직접 진입하면
 * 셸은 렌더되고 내부 페이지 API 만 403 이 되어 raw 오류 카드가 노출됐다.
 * 관리자 영역(AdminLayoutWrapper.NoAdminAccess)과 같은 형태의 역할 안내 +
 * 안전한 복귀 링크로 대체한다. API guard·권한 범위는 변경하지 않는다.
 */
function NoOperatorAccess() {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center">
      <h2 className="mb-2 text-lg font-semibold">운영자 권한이 필요합니다</h2>
      <p className="mb-4 text-sm text-gray-600">
        이 영역은 서비스 운영자 전용입니다. 매장 업무는 내 매장에서 처리해 주세요.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link to="/store-owner" className="text-sm text-primary-600 underline">
          내 매장으로 이동
        </Link>
        <Link to="/" className="text-sm text-gray-500 underline">
          홈으로
        </Link>
      </div>
    </div>
  );
}

export function OperatorLayoutWrapper() {
  const { user } = useAuth();

  // adminOnly 항목 필터용. 현재 UNIFIED_MENU 에 adminOnly 항목은 없다(결과 동일).
  const isAdmin = user ? isAdminOrAbove((user.roles as string[]) ?? [], SERVICE_KEY) : false;

  const menuItems = useMemo(() => filterMenuByRole(UNIFIED_MENU, isAdmin), [isAdmin]);

  // 운영자 이상 여부 — satisfiesRole(operator) 는 operator | admin | platform:super_admin 을 포함한다.
  const isOperator = satisfiesRole(((user?.roles as string[]) ?? []), ROLES.operator);

  if (!isOperator) {
    return (
      <MembershipGate>
        <NoOperatorAccess />
      </MembershipGate>
    );
  }

  return (
    <MembershipGate>
      <OperatorAreaShell
        header={<OperatorHeader />}
        menuItems={menuItems}
        capabilities={ENABLED_CAPABILITIES}
        domainIAConfig={PHARMACY_HUB_OPERATOR_DOMAIN_IA}
      />
    </MembershipGate>
  );
}
