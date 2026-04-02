import { OperatorCapability } from '@o4o/types';

/**
 * WO-O4O-OPERATOR-CAPABILITY-LAYER-V1
 * WO-KPA-A-OPERATOR-DASHBOARD-REFINE-V1: 실제 활성 기능에 맞게 동기화
 *
 * KPA Society — 커뮤니티 + 콘텐츠 + 사이니지 + 매장 + 분석 + 시스템
 */
export const ENABLED_CAPABILITIES: OperatorCapability[] = [
  OperatorCapability.USER_MANAGEMENT,
  OperatorCapability.MEMBERSHIP_APPROVAL,
  OperatorCapability.CONTENT_MANAGEMENT,
  OperatorCapability.COMMUNITY,
  OperatorCapability.SIGNAGE,
  OperatorCapability.STORE_MANAGEMENT,
  OperatorCapability.ANALYTICS,
  OperatorCapability.SETTINGS,
];
