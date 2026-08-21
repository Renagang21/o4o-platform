/**
 * OperatorForumPage — Pharmacy-Hub 운영자 포럼 운영 허브 (read-only)
 *
 * WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
 *   공통 @o4o/operator-core-ui/modules/forum-hub 를 그대로 채택한다 (KPA / K-Cosmetics 동일 콘솔).
 *   서비스 operator 는 community post 삭제 권한이 없으므로 enablePostActions 미설정(read-only).
 *   backend/API/DB 변경 없음 — 공통 `/api/v1/forum/operator/analytics/summary` + public posts read 만 사용.
 */

import { OperatorForumHubPage } from '@o4o/operator-core-ui/modules/forum-hub';
import type { ForumHubClient } from '@o4o/operator-core-ui/modules/forum-hub';
import { forumAnalyticsApi, fetchPharmacyHubForumPosts } from '../../services/forumApi';

const client: ForumHubClient = {
  getSummary: () => forumAnalyticsApi.getSummary(),
  getPosts: async (params) => {
    const result = await fetchPharmacyHubForumPosts({ limit: params?.limit, sortBy: 'latest' });
    return { data: result.posts };
  },
};

export default function OperatorForumPage() {
  return (
    <OperatorForumHubPage
      client={client}
      accent={{ iconColor: '#0f766e', iconBgColor: '#ccfbf1' }}
      nav={{
        requests: '/operator/forum-requests',
        categories: '/operator/forum-categories',
        deleteRequests: '/operator/forum-delete-requests',
        analytics: '/operator/forum-analytics',
        postDetail: (id) => `/forum/posts/${id}`,
      }}
      tableId="pharmacy-hub-forum-posts"
    />
  );
}
