/**
 * GlucoseView — Action Queue Definitions
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * 기존 operator-dashboard.service.ts actionQueue 항목을 ActionDefinition 형식으로 정의.
 */

import type { DataSource } from 'typeorm';
import type { ServiceActionConfig, AiRuleAction } from '../../common/action-queue/action-queue.types.js';
import logger from '../../utils/logger.js';

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
    {
      id: 'care-alerts',
      type: 'care',
      title: '케어 알림 미확인',
      description: '확인되지 않은 환자 케어 알림이 있습니다.',
      query: `SELECT COUNT(*)::int AS cnt
              FROM care_alerts
              WHERE is_resolved = false
                AND service_code = 'glucoseview'`,
      actionUrl: '/operator/care/alerts',
      actionLabel: '일괄 확인',
      actionType: 'EXECUTE',
      actionApi: '/glucoseview/operator/actions/execute/care-alerts',
      actionMethod: 'POST',
      alwaysHigh: true,
    },
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
  executeHandlers: {
    // WO-O4O-ACTION-EXECUTION-LAYER-V1: 케어 알림 일괄 확인
    'care-alerts': async (dataSource: DataSource, userId: string) => {
      logger.info(`[ActionExecute] glucoseview/care-alerts by ${userId}`);
      const result = await dataSource.query(
        `UPDATE care_alerts SET is_resolved = true, updated_at = NOW()
         WHERE is_resolved = false AND service_code = 'glucoseview'
         RETURNING id`,
      );
      const count = Array.isArray(result) ? result.length : 0;
      return { processed: count, succeeded: count, failed: 0 };
    },
  },
  aiRuleGenerator: (counts) => {
    const actions: AiRuleAction[] = [];
    if ((counts['care-alerts'] || 0) > 5) {
      actions.push({
        id: 'ai-care-overload',
        type: 'care',
        title: '케어 알림 과다 — 즉시 확인 필요',
        description: `미확인 케어 알림 ${counts['care-alerts']}건이 적체되고 있습니다`,
        priority: 'high',
        confidence: 0.9,
        actionUrl: '/operator/care/alerts',
        actionLabel: '알림 확인',
        actionType: 'NAVIGATE',
      });
    }
    return actions;
  },
};
