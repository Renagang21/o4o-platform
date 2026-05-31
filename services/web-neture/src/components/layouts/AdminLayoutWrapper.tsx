/**
 * Neture AdminLayoutWrapper
 *
 * WO-O4O-ROLE-ROUTE-ISOLATION-V1
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: GlobalHeader 추가, OperatorShell 헤더 제거
 * WO-O4O-NETURE-ADMIN-DASHBOARD-ACTUAL-STRUCTURE-FIX-V1:
 *   admin sidebar 가 operator 메뉴 superset 으로 보이던 문제 해소 — getAdminMenu()
 *   재설계로 admin 전용 항목 + 운영자 업무 바로가기 1개만 표시.
 * WO-O4O-NETURE-UX-LABEL-LAYOUT-SLIM-ALIGNMENT-V1:
 *   serviceName 을 OperatorLayoutWrapper 와 동일하게 "Neture" 로 통일.
 * WO-O4O-NETURE-ADMIN-LAYOUT-OPERATORAREASHELL-MIGRATION-V1:
 *   legacy OperatorShell(flat sidebar) → @o4o/operator-ux-core 의 OperatorAreaShell + DomainIASidebar 이행.
 *   operator 영역과 동일한 Neture 4-domain IA(NETURE_OPERATOR_DOMAIN_IA) 를 domainIAConfig 로 주입.
 *   menuItems 는 admin 전용 getAdminMenu() 유지 — admin 메뉴 group key 가 동일 domain 매핑에 정합하며,
 *   admin 미사용 group(stores/forum/signage)은 항목 없음으로 skip 되어 빈 domain 헤딩 미표시.
 *   NetureGlobalHeader 는 header slot 유지. footer 제거 (operator 영역 정합).
 *
 * admin 전용 레이아웃. GlobalHeader(Layer A) + DomainIASidebar(Layer C) 구조.
 */

import { OperatorAreaShell } from '@o4o/operator-ux-core';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { getAdminMenu, NETURE_OPERATOR_DOMAIN_IA } from '../../config/operatorMenuGroups';
import { NetureGlobalHeader } from '../NetureGlobalHeader';

export default function AdminLayoutWrapper() {
  // admin 전용 slim 메뉴 (admin 항목 + "운영자 업무 →" 게이트) — operator 와 분리.
  const menuItems = getAdminMenu();

  return (
    <OperatorAreaShell
      header={<NetureGlobalHeader />}
      menuItems={menuItems}
      capabilities={ENABLED_CAPABILITIES}
      domainIAConfig={NETURE_OPERATOR_DOMAIN_IA}
    />
  );
}
