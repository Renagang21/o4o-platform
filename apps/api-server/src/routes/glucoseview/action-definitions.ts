/**
 * GlucoseView — Action Queue Definitions
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * 기존 operator-dashboard.service.ts actionQueue 항목을 ActionDefinition 형식으로 정의.
 */

// WO-CARE-ALERTS-BROKEN-BULK-RESOLVE-REMOVE-V1: DataSource/AiRuleAction/logger import 제거
import type { ServiceActionConfig } from '../../common/action-queue/action-queue.types.js';

export const glucoseviewActionConfig: ServiceActionConfig = {
  serviceKey: 'glucoseview',
  definitions: [
    {
      id: 'pending-applications',
      type: 'approval',
      title: '신청 승인 대기',
      description: '입점 신청이 대기 중입니다.',
      query: `SELECT COUNT(*)::int AS cnt, MIN(submitted_at) AS oldest
              FROM glucoseview_applications WHERE status = 'submitted'`,
      actionUrl: '/operator/applications',
      actionLabel: '신청 관리',
      actionType: 'NAVIGATE',
      alwaysHigh: true,
    },
    {
      id: 'pending-pharmacists',
      type: 'pharmacist',
      title: '약사 승인 대기',
      description: '약사 승인 요청이 대기 중입니다.',
      query: `SELECT COUNT(*)::int AS cnt
              FROM glucoseview_pharmacists WHERE approval_status = 'pending'`,
      actionUrl: '/operator/users',
      actionLabel: '약사 관리',
      actionType: 'NAVIGATE',
      alwaysHigh: true,
    },
    // WO-CARE-ALERTS-BROKEN-BULK-RESOLVE-REMOVE-V1:
    // 'care-alerts' 정의 제거. 사유: broken SQL (is_resolved/service_code 컬럼 없음) +
    // 활성화 시 검토 없는 일괄 resolve 위험. 정상 흐름은 operator-dashboard.service.ts
    // NAVIGATE 카드로 유지
    {
      id: 'suspended-members',
      type: 'member',
      title: '정지 회원 복구 대기',
      description: '정지 상태의 회원이 있습니다.',
      query: `SELECT COUNT(*)::int AS cnt, MIN(sm.updated_at) AS oldest
              FROM service_memberships sm
              WHERE sm.status = 'suspended' AND sm.service_key = 'glucoseview'`,
      actionUrl: '/operator/users?status=suspended',
      actionLabel: '회원 관리',
      actionType: 'NAVIGATE',
    },
  ],
  // WO-CARE-ALERTS-BROKEN-BULK-RESOLVE-REMOVE-V1:
  // 'care-alerts' execute handler + 'ai-care-overload' AI rule 제거
  executeHandlers: {},
};
