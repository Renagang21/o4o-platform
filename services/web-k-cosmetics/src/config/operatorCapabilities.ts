import { OperatorCapability } from '@o4o/types';

/**
 * WO-O4O-OPERATOR-CAPABILITY-LAYER-V1
 * K-Cosmetics — 커머스 + 콘텐츠 Capability
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-GAP-FIX-V1:
 *   IR-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-POLICY-AUDIT-V1 의 Accidental Gap
 *   판정에 따라 ANALYTICS + COMMUNITY 활성화 복구.
 *   - ANALYTICS: analytics 그룹 (AI 리포트) + 운영 공통 도메인 헤딩 복원.
 *     K-Cos common 도메인 유일 그룹이 차단되어 도메인 헤딩 자체가 미노출.
 *   - COMMUNITY: forum 그룹 (포럼 신청 / 삭제 요청 / 포럼 분석 3 항목).
 *     CLAUDE.md §13 "forum 은 플랫폼 공통 구조" 원칙 정합.
 *   각 항목 모두 UNIFIED_MENU 정의 + App.tsx 라우트 + 페이지 lazy 모두 실재.
 *   본 WO 는 정책 추가가 아닌 정합 회복.
 */
export const ENABLED_CAPABILITIES: OperatorCapability[] = [
  OperatorCapability.USER_MANAGEMENT,
  OperatorCapability.MEMBERSHIP_APPROVAL,
  OperatorCapability.CONTENT_MANAGEMENT,
  OperatorCapability.COMMUNITY,
  OperatorCapability.SIGNAGE,
  OperatorCapability.STORE_MANAGEMENT,
  OperatorCapability.ANALYTICS,
];
