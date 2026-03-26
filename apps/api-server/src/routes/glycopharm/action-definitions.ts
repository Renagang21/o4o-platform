/**
 * GlycoPharm — Action Queue Definitions
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * 기존 operator-dashboard.service.ts actionQueue 항목을 ActionDefinition 형식으로 정의.
 */

import type { DataSource } from 'typeorm';
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
    {
      id: 'care-alerts',
      type: 'care',
      title: '케어 알림 미확인',
      description: '확인되지 않은 환자 케어 알림이 있습니다.',
      query: `SELECT COUNT(*)::int AS cnt
              FROM care_alerts
              WHERE is_resolved = false
                AND service_code = 'glycopharm'`,
      actionUrl: '/operator/care/alerts',
      actionLabel: '일괄 확인',
      actionType: 'EXECUTE',
      actionApi: '/glycopharm/operator/actions/execute/care-alerts',
      actionMethod: 'POST',
      alwaysHigh: true,
    },
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
  ],
  executeHandlers: {
    // WO-O4O-ACTION-EXECUTION-LAYER-V1: 케어 알림 일괄 확인
    'care-alerts': async (dataSource: DataSource, _userId: string) => {
      const result = await dataSource.query(
        `UPDATE care_alerts SET is_resolved = true, updated_at = NOW()
         WHERE is_resolved = false AND service_code = 'glycopharm'
         RETURNING id`,
      );
      const count = Array.isArray(result) ? result.length : 0;
      return { processed: count, succeeded: count, failed: 0 };
    },
  },
  aiRuleGenerator: (counts) => {
    const actions: AiRuleAction[] = [];
    if ((counts['care-alerts'] || 0) > 3) {
      actions.push({
        id: 'ai-care-priority',
        type: 'care',
        title: '긴급 케어 알림 다수 발생',
        description: `미확인 케어 알림 ${counts['care-alerts']}건 — 빠른 확인이 필요합니다`,
        priority: 'high',
        confidence: 0.85,
        actionUrl: '/operator/care/alerts',
        actionLabel: '알림 확인',
        actionType: 'NAVIGATE',
      });
    }
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
