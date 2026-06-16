/**
 * OperatorForumPage — KPA-a Operator 포럼 운영 허브
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-FORUM-HUB-READONLY-INTRODUCE-V1:
 *   직접 구현(KPI/바로가기/최근글 DataTable + 단건·일괄 삭제)을
 *   @o4o/operator-core-ui/modules/forum-hub 의 OperatorForumHubPage thin wrapper 로 수렴.
 *   KPA 는 기존 동작 보존 — enablePostActions=true (게시글 수정/삭제 유지, platform-admin override 경로),
 *   nav 타깃/accent(blue) 주입. backend/API/route/menu 변경 없음.
 *
 * 공통 /api/v1/forum/operator/* + community /forum API 사용 (forumApi, forumAnalyticsApi)
 */

import { OperatorForumHubPage } from '@o4o/operator-core-ui/modules/forum-hub';
import type { ForumHubClient } from '@o4o/operator-core-ui/modules/forum-hub';
import { forumApi, forumAnalyticsApi } from '../../api/forum';

const client: ForumHubClient = {
  getSummary: () => forumAnalyticsApi.getSummary(),
  getPosts: (params) => forumApi.getPosts(params),
  deletePost: (id) => forumApi.deletePost(id),
};

export default function OperatorForumPage() {
  return (
    <OperatorForumHubPage
      client={client}
      accent={{ iconColor: '#2563eb', iconBgColor: '#dbeafe' }}
      nav={{
        requests: '/operator/forum-management',
        deleteRequests: '/operator/forum-delete-requests',
        analytics: '/operator/forum-analytics',
        community: '/operator/community',
        postDetail: (id) => `/forum/post/${id}`,
        postEdit: (id) => `/forum/edit/${id}`,
      }}
      enablePostActions
      tableId="kpa-forum-posts"
    />
  );
}
