/**
 * KPA Society — Action Queue Definitions
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * 기존 operator-summary.controller.ts actionQueue 항목을 ActionDefinition 형식으로 정의.
 */

import type { DataSource } from 'typeorm';
import type { ServiceActionConfig, AiRuleAction } from '../../common/action-queue/action-queue.types.js';
import logger from '../../utils/logger.js';

export const kpaActionConfig: ServiceActionConfig = {
  serviceKey: 'kpa-society',
  definitions: [
    {
      id: 'content-pending',
      type: 'content',
      title: '콘텐츠 승인 대기',
      description: '승인 대기 중인 콘텐츠가 있습니다.',
      query: `SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest
              FROM cms_contents
              WHERE "serviceKey" IN ('kpa-society', 'kpa')
                AND status = 'pending'`,
      actionUrl: '/operator/content?status=pending',
      actionLabel: '일괄 승인',
      actionType: 'EXECUTE',
      actionApi: '/kpa/operator/actions/execute/content-pending',
      actionMethod: 'POST',
      alwaysHigh: true,
    },
    {
      id: 'content-draft',
      type: 'content-draft',
      title: '콘텐츠 임시저장',
      description: '임시저장 상태의 콘텐츠가 있습니다.',
      query: `SELECT COUNT(*)::int AS cnt
              FROM cms_contents
              WHERE "serviceKey" IN ('kpa-society', 'kpa')
                AND status = 'draft'`,
      actionUrl: '/operator/content?status=draft',
      actionLabel: '콘텐츠 관리',
      actionType: 'NAVIGATE',
    },
    {
      id: 'forum-pending',
      type: 'forum',
      title: '포럼 카테고리 요청',
      description: '포럼 카테고리 신청이 대기 중입니다.',
      query: `SELECT (
                SELECT COUNT(*) FROM forum_category_requests
                WHERE status = 'pending' AND service_code = 'kpa-society'
              ) + (
                SELECT COUNT(*) FROM kpa_approval_requests
                WHERE status = 'pending' AND entity_type = 'forum_category'
              ) AS cnt`,
      actionUrl: '/operator/forum',
      actionLabel: '포럼 관리',
      actionType: 'NAVIGATE',
    },
    {
      id: 'member-pending',
      type: 'approval',
      title: '가입 승인 대기',
      description: '회원 가입 신청이 대기 중입니다.',
      query: `SELECT (
                SELECT COUNT(*) FROM kpa_approval_requests
                WHERE status = 'pending' AND entity_type = 'membership'
              ) + (
                SELECT COUNT(*) FROM kpa_organization_join_requests
                WHERE status = 'pending'
              ) AS cnt`,
      actionUrl: '/operator/members',
      actionLabel: '회원 관리',
      actionType: 'NAVIGATE',
      alwaysHigh: true,
    },
    // WO-KPA-A-OPERATOR-DASHBOARD-REFINE-V1: instructor-pending, course-pending 제거
    // KPA-a에 LMS/강사 기능 없음 — 무관 항목 비노출
    {
      id: 'suspended-members',
      type: 'member',
      title: '정지 회원 복구 대기',
      description: '정지 상태의 회원이 있습니다.',
      query: `SELECT COUNT(*)::int AS cnt, MIN(sm.updated_at) AS oldest
              FROM service_memberships sm
              WHERE sm.status = 'suspended' AND sm.service_key = 'kpa-society'`,
      actionUrl: '/operator/users?status=suspended',
      actionLabel: '회원 관리',
      actionType: 'NAVIGATE',
    },
  ],
  executeHandlers: {
    // WO-O4O-ACTION-EXECUTION-LAYER-V1: 대기 콘텐츠 일괄 승인 (pending → published)
    'content-pending': async (dataSource: DataSource, userId: string) => {
      logger.info(`[ActionExecute] kpa/content-pending by ${userId}`);
      const result = await dataSource.query(
        `UPDATE cms_contents
         SET status = 'published', updated_at = NOW()
         WHERE "serviceKey" IN ('kpa-society', 'kpa')
           AND status = 'pending'
         RETURNING id`,
      );
      const count = Array.isArray(result) ? result.length : 0;
      return { processed: count, succeeded: count, failed: 0 };
    },
  },
  aiRuleGenerator: (counts) => {
    const actions: AiRuleAction[] = [];
    if ((counts['content-draft'] || 0) > 10) {
      actions.push({
        id: 'ai-content-batch',
        type: 'content-draft',
        title: '임시저장 콘텐츠가 많습니다',
        description: `${counts['content-draft']}건의 콘텐츠가 임시저장 상태입니다 — 발행을 검토하세요`,
        priority: 'medium',
        confidence: 0.7,
        actionUrl: '/operator/content?status=draft',
        actionLabel: '콘텐츠 관리',
        actionType: 'NAVIGATE',
      });
    }
    if ((counts['member-pending'] || 0) > 5) {
      actions.push({
        id: 'ai-member-backlog',
        type: 'approval',
        title: '가입 승인 적체',
        description: `${counts['member-pending']}건의 가입 승인이 대기 중입니다 — 빠른 처리가 필요합니다`,
        priority: 'high',
        confidence: 0.8,
        actionUrl: '/operator/members',
        actionLabel: '회원 관리',
        actionType: 'NAVIGATE',
      });
    }
    return actions;
  },
};
