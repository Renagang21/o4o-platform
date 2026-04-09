/**
 * GlycoPharm — Action Queue Definitions
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * 기존 operator-dashboard.service.ts actionQueue 항목을 ActionDefinition 형식으로 정의.
 */

// WO-CARE-ALERTS-BROKEN-BULK-RESOLVE-REMOVE-V1: DataSource/logger import 제거
import type { ServiceActionConfig, AiRuleAction } from '../../common/action-queue/action-queue.types.js';

export const glycopharmActionConfig: ServiceActionConfig = {
  serviceKey: 'glycopharm',
  definitions: [
    {
      id: 'pending-apps',
      type: 'approval',
      title: '입점 신청 대기',
      description: '신규 약국 입점 신청이 대기 중입니다.',
      query: `SELECT COUNT(*)::int AS cnt, MIN(submitted_at) AS oldest
              FROM glycopharm_applications WHERE status = 'submitted'`,
      actionUrl: '/operator/applications',
      actionLabel: '신청 관리',
      actionType: 'NAVIGATE',
      alwaysHigh: true,
    },
    {
      id: 'draft-products',
      type: 'product',
      title: '임시저장 상품',
      description: '임시저장 상태의 상품이 있습니다.',
      query: `SELECT COUNT(*)::int AS cnt
              FROM glycopharm_products WHERE status = 'draft'`,
      actionUrl: '/operator/products?status=draft',
      actionLabel: '상품 관리',
      actionType: 'NAVIGATE',
    },
    // WO-CARE-ALERTS-BROKEN-BULK-RESOLVE-REMOVE-V1:
    // 'care-alerts' 정의 제거. 사유:
    // (1) 쿼리/핸들러가 존재하지 않는 컬럼(is_resolved, service_code)을 참조 → dead code
    // (2) 활성화될 경우 약사가 환자 검토 없이 알림을 일괄 resolve 하게 됨 → 의료 안전 위험
    // 정상 흐름(operator-dashboard.service.ts NAVIGATE 카드 + 약사용 OperatorCareAlertsPage
    // + care-alert.service.ts 단건 acknowledge/resolve)은 그대로 유지
    {
      id: 'forum-requests',
      type: 'forum',
      title: '포럼 카테고리 요청',
      description: '포럼 카테고리 신청이 대기 중입니다.',
      query: `SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest
              FROM forum_category_requests
              WHERE status = 'pending' AND service_code = 'glycopharm'`,
      actionUrl: '/operator/forum-requests',
      actionLabel: '요청 관리',
      actionType: 'NAVIGATE',
    },
    {
      id: 'suspended-members',
      type: 'member',
      title: '정지 회원 복구 대기',
      description: '정지 상태의 회원이 있습니다.',
      query: `SELECT COUNT(*)::int AS cnt, MIN(sm.updated_at) AS oldest
              FROM service_memberships sm
              WHERE sm.status = 'suspended' AND sm.service_key = 'glycopharm'`,
      actionUrl: '/operator/users?status=suspended',
      actionLabel: '회원 관리',
      actionType: 'NAVIGATE',
    },
  ],
  // WO-CARE-ALERTS-BROKEN-BULK-RESOLVE-REMOVE-V1:
  // 'care-alerts' execute handler 제거 (broken SQL + 의료 안전 위험)
  executeHandlers: {},
  aiRuleGenerator: (counts) => {
    const actions: AiRuleAction[] = [];
    // WO-CARE-ALERTS-BROKEN-BULK-RESOLVE-REMOVE-V1:
    // 'ai-care-priority' (care-alerts > 3) 제거 — care-alerts 정의 자체가 사라져 카운트 항상 0
    if ((counts['pending-apps'] || 0) > 0 && (counts['care-alerts'] || 0) === 0) {
      actions.push({
        id: 'ai-app-review',
        type: 'approval',
        title: '입점 신청 검토 권장',
        description: `대기 중인 입점 신청 ${counts['pending-apps']}건이 있습니다`,
        priority: 'medium',
        confidence: 0.7,
        actionUrl: '/operator/applications',
        actionLabel: '신청 관리',
        actionType: 'NAVIGATE',
      });
    }
    return actions;
  },
};
