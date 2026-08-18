/**
 * Pharmacy-Hub Operator Capabilities
 *
 * WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1
 *
 * DomainIASidebar 의 그룹 visibility gate. STANDARD_GROUPS 의 capability 와 대조되며,
 * 활성화되지 않은 capability 의 그룹은 메뉴 항목이 있어도 노출되지 않는다.
 *
 * 현재 Pharmacy-Hub 운영자 화면은 가입 신청 관리(승인 그룹) 뿐이므로
 * MEMBERSHIP_APPROVAL 만 활성화한다. 화면이 늘어날 때 해당 WO 에서 함께 넓힌다.
 */

import { OperatorCapability } from '@o4o/types';

export const ENABLED_CAPABILITIES: OperatorCapability[] = [
  OperatorCapability.MEMBERSHIP_APPROVAL,
  // WO-O4O-PHARMACY-HUB-SERVICE-LEGAL-SETTINGS-ADOPTION-V1:
  //   system 그룹(법정정보 설정) 노출용. 해당 그룹의 실재 항목은 /operator/settings/legal 1건이다.
  OperatorCapability.SETTINGS,
];
