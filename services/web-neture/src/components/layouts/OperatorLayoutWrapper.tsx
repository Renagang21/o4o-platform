/**
 * Neture OperatorLayoutWrapper
 *
 * WO-O4O-ROLE-ROUTE-ISOLATION-V1
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: GlobalHeader 추가, OperatorShell 헤더 제거
 * WO-O4O-NETURE-OPERATOR-SIDEBAR-LAYOUT-MIGRATION-V1:
 *   legacy OperatorShell(flat sidebar) → @o4o/operator-ux-core 의 OperatorAreaShell + DomainIASidebar 이행.
 *   Neture 전용 4-domain IA(NETURE_OPERATOR_DOMAIN_IA) 를 domainIAConfig 로 주입.
 *   NetureGlobalHeader 는 header slot 으로 유지. operator 전용(adminOnly 제외) 정책 보존 —
 *   filterMenuByRole(UNIFIED_MENU, false). footer 는 제거 (KPA/GlycoPharm/K-Cosmetics operator 정합).
 */

import { OperatorAreaShell } from '@o4o/operator-ux-core';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import {
  UNIFIED_MENU,
  filterMenuByRole,
  NETURE_OPERATOR_DOMAIN_IA,
} from '../../config/operatorMenuGroups';
import { NetureGlobalHeader } from '../NetureGlobalHeader';

export default function OperatorLayoutWrapper() {
  // operator sidebar 는 operator-scope 메뉴만 (admin 항목은 AdminLayoutWrapper 별도) — isAdmin=false 보존.
  const menuItems = filterMenuByRole(UNIFIED_MENU, false);

  return (
    <OperatorAreaShell
      header={<NetureGlobalHeader />}
      menuItems={menuItems}
      capabilities={ENABLED_CAPABILITIES}
      domainIAConfig={NETURE_OPERATOR_DOMAIN_IA}
    />
  );
}
