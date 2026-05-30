import { OperatorCapability } from '@o4o/types';

/**
 * WO-O4O-OPERATOR-CAPABILITY-LAYER-V1
 * GlycoPharm — 핵심 운영 Capability
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-GAP-FIX-V1:
 *   IR-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-POLICY-AUDIT-V1 의 Accidental Gap
 *   판정에 따라 STORE_MANAGEMENT + COMMUNITY + SETTINGS 활성화 복구.
 *   - STORE_MANAGEMENT: stores/products/orders 그룹 (약국 관리, 매장 관리,
 *     채널 관리, 약국 HUB 블로그/POP/QR, 상품 관리, 주문 관리 8 항목 노출)
 *   - COMMUNITY: forum 그룹 (포럼 관리/신청/삭제 요청/커뮤니티 관리/포럼 분석)
 *   - SETTINGS: system 그룹 (서비스 설정 + Admin 회원 관리, adminOnly 보존)
 *   각 항목 모두 UNIFIED_MENU 정의 + App.tsx 라우트 + 페이지 lazy 모두 실재.
 *   본 WO 는 정책 추가가 아닌 정합 회복 (philosophy / 3-role flow / 공통 구조
 *   원칙 / HUB Publishing / Store Menu Canonical 4 SSOT 와 정합).
 */
export const ENABLED_CAPABILITIES: OperatorCapability[] = [
  OperatorCapability.USER_MANAGEMENT,
  OperatorCapability.MEMBERSHIP_APPROVAL,
  OperatorCapability.CONTENT_MANAGEMENT,
  OperatorCapability.COMMUNITY,
  OperatorCapability.SIGNAGE,
  OperatorCapability.STORE_MANAGEMENT,
  OperatorCapability.ANALYTICS,
  OperatorCapability.CARE,
  OperatorCapability.SETTINGS,
];
