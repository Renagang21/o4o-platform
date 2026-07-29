/**
 * KPA Society — Action Queue Definitions
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * 기존 operator-summary.controller.ts actionQueue 항목을 ActionDefinition 형식으로 정의.
 */

// WO-PLATFORM-ACTION-QUEUE-DECISION-PRESSURE-REMOVE-V1: DataSource/logger import 제거
import type { ServiceActionConfig, AiRuleAction } from '../../common/action-queue/action-queue.types.js';

export const kpaActionConfig: ServiceActionConfig = {
  serviceKey: 'kpa-society',
  definitions: [
    // WO-PLATFORM-ACTION-QUEUE-DECISION-PRESSURE-REMOVE-V1:
    // EXECUTE(일괄 published) 제거 → NAVIGATE 로 전환. 운영자는 콘텐츠 관리 화면에서
    // 개별 검토 후 발행하도록 강제. alwaysHigh 도 제거하여 압박 강도 완화.
    {
      id: 'content-pending',
      type: 'content',
      title: '콘텐츠 승인 대기',
      description: '검토가 필요한 콘텐츠가 있습니다.',
      query: `SELECT COUNT(*)::int AS cnt, MIN(created_at) AS oldest
              FROM cms_contents
              WHERE "serviceKey" IN ('kpa-society', 'kpa')
                AND status = 'pending'`,
      actionUrl: '/operator/content?status=pending',
      actionLabel: '콘텐츠 검토',
      actionType: 'NAVIGATE',
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
      // WO-O4O-KPA-OPERATOR-ACTION-QUEUE-CANONICAL-LINK-FIX-V1:
      //   집계 대상 = 포럼 카테고리 신청 대기. canonical 신청 처리 화면 =
      //   /operator/forum-requests (ForumRequestsManagementPage). 기존 /operator/forum
      //   (OperatorForumPage) 은 포럼 운영 화면이라 집계 의미와 도착 화면이 불일치했음.
      actionUrl: '/operator/forum-requests',
      actionLabel: '포럼 관리',
      actionType: 'NAVIGATE',
    },
    {
      id: 'member-pending',
      type: 'approval',
      title: '가입 승인 대기',
      description: '회원 가입 신청이 대기 중입니다.',
      // WO-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1:
      //   dead 채널 2개 term(kpa_approval_requests entity_type='membership' + orphan
      //   kpa_organization_join_requests, 둘 다 프로덕션 0건) 제거 →
      //   canonical pending 회원 = kpa_members.status='pending' 단일 source 로 재정합.
      //   (orphan-table term 제거 = 물리 테이블 DROP 마이그레이션의 lockstep 선행조건)
      query: `SELECT COUNT(*)::int AS cnt FROM kpa_members WHERE status = 'pending'`,
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
      // WO-O4O-KPA-OPERATOR-ACTION-QUEUE-CANONICAL-LINK-FIX-V1:
      //   canonical 회원 관리 화면 = /operator/members. 기존 /operator/users 는
      //   static Navigate 로 /operator/members 로 redirect 되며 query(status=suspended)를
      //   보존하지 못했음 → redirect 의존 제거하고 canonical route 로 직접 연결.
      // WO-O4O-KPA-OPERATOR-MEMBER-DEEPLINK-STATUS-TAB-SYNC-V1:
      //   공용 콘솔 canonical query 계약(members_tab=<statusTab key>)으로 정렬 → syncUrl 로 '정지' 탭 자동 선택.
      //   ?status= 레거시 query 는 콘솔이 읽지 않으므로 호환 추가 없이 canonical 로 전환.
      actionUrl: '/operator/members?members_tab=status-suspended',
      actionLabel: '회원 관리',
      actionType: 'NAVIGATE',
    },
  ],
  // WO-PLATFORM-ACTION-QUEUE-DECISION-PRESSURE-REMOVE-V1:
  // 'content-pending' 일괄 published execute handler 제거 (검토 없는 일괄 발행 방지)
  executeHandlers: {},
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
