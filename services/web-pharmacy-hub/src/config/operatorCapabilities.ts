/**
 * Pharmacy-Hub Operator Capabilities
 *
 * WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1
 *
 * DomainIASidebar 의 그룹 visibility gate. STANDARD_GROUPS 의 capability 와 대조되며,
 * 활성화되지 않은 capability 의 그룹은 메뉴 항목이 있어도 노출되지 않는다.
 *
 * capability 는 **실재하는 화면이 있는 그룹만** 켠다 (빈 그룹 헤딩 노출 방지).
 */

import { OperatorCapability } from '@o4o/types';

export const ENABLED_CAPABILITIES: OperatorCapability[] = [
  OperatorCapability.MEMBERSHIP_APPROVAL,
  // WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1:
  //   법정정보 설정이 관리자 영역으로 이동해 운영자 system 그룹의 실재 항목이 0 이 되었으므로
  //   SETTINGS capability 를 되돌린다(빈 그룹 헤딩 노출 방지). 관리자 영역 capability 는
  //   config/adminMenuGroups.ts 의 ADMIN_ENABLED_CAPABILITIES 가 소유한다.

  // WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
  //   공통 Operator capability 실채택에 따른 확장. 각 capability 는 실제 route·화면·
  //   backend 가 모두 연결된 그룹에만 대응한다.
  //     USER_MANAGEMENT → users     : 회원 관리 (/operator/members)
  //     COMMUNITY       → forum     : 포럼 운영 5화면
  //     ANALYTICS       → analytics : 운영 분석 (/operator/analytics)
  //     SETTINGS        → system    : 역할 관리 (/operator/roles, adminOnly)
  //   매장/상품/주문/사이니지 capability 는 켜지 않는다 — Pharmacy-Hub 는 매장 HUB·거래 개입
  //   기능을 운영자 축에 두지 않는다(WO 제외 대상).
  // WO-O4O-OPERATOR-CROSSSERVICE-CAPABILITY-ADOPTION-FINAL-AUDIT-AND-GAP-CLOSURE-V1:
  //   CONTENT_MANAGEMENT -> resources : 자료실 관리 (/operator/resources).
  //   이 capability 가 없으면 메뉴 항목이 있어도 DomainIASidebar 가 그룹을 숨긴다(기능 은폐).
  //   PH UNIFIED_MENU 에 content · lms 항목은 없으므로 빈 그룹 헤딩은 생기지 않는다.
  OperatorCapability.CONTENT_MANAGEMENT,
  OperatorCapability.USER_MANAGEMENT,
  OperatorCapability.COMMUNITY,
  OperatorCapability.ANALYTICS,
  OperatorCapability.SETTINGS,
];
