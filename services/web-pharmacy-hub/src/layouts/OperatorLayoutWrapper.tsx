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
import { isAdminOrAbove } from '@o4o/auth-utils';
import { filterMenuByRole } from '@o4o/ui';
import { OperatorAreaShell } from '@o4o/operator-ux-core';
import { useAuth } from '../contexts/AuthContext';
import { MembershipGate } from '../components/MembershipGate';
import { OperatorHeader } from '../components/operator/OperatorHeader';
import { ENABLED_CAPABILITIES } from '../config/operatorCapabilities';
import { UNIFIED_MENU, PHARMACY_HUB_OPERATOR_DOMAIN_IA } from '../config/operatorMenuGroups';
import { SERVICE_KEY } from '../config/service';

export function OperatorLayoutWrapper() {
  const { user } = useAuth();

  // adminOnly 항목 필터용. 현재 UNIFIED_MENU 에 adminOnly 항목은 없다(결과 동일).
  const isAdmin = user ? isAdminOrAbove((user.roles as string[]) ?? [], SERVICE_KEY) : false;

  const menuItems = useMemo(() => filterMenuByRole(UNIFIED_MENU, isAdmin), [isAdmin]);

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
