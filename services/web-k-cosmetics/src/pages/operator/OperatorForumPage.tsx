/**
 * OperatorForumPage — K-Cosmetics Operator 포럼 운영 허브 (read-only)
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-FORUM-HUB-READONLY-INTRODUCE-V1:
 *   @o4o/operator-core-ui/modules/forum-hub 의 OperatorForumHubPage 도입.
 *   서비스 operator 는 community post 삭제 권한이 없으므로(IR feasibility) read-only —
 *   enablePostActions 미설정(false): 게시글 수정/단건·일괄 삭제 미노출.
 *   nav 는 KCos 실제 route 로 주입 (포럼 관리 → /operator/forum-requests).
 *   /operator/community route 부재 → community shortcut 미주입(dead-nav 방지).
 *   backend/API/DB 변경 없음 — analytics summary + community posts read 만 사용.
 */

import { OperatorForumHubPage } from '@o4o/operator-core-ui/modules/forum-hub';
import type { ForumHubClient } from '@o4o/operator-core-ui/modules/forum-hub';
import { forumAnalyticsApi, fetchForumPosts } from '@/services/forumApi';

const client: ForumHubClient = {
  getSummary: () => forumAnalyticsApi.getSummary(),
  getPosts: (params) => fetchForumPosts({ limit: params?.limit }).then((r) => ({ data: r.data })),
};

export default function OperatorForumPage() {
  return (
    <OperatorForumHubPage
      client={client}
      accent={{ iconColor: '#db2777', iconBgColor: '#fce7f3' }}
      nav={{
        requests: '/operator/forum-requests',
        categories: '/operator/forum-categories',
        deleteRequests: '/operator/forum-delete-requests',
        analytics: '/operator/forum-analytics',
        postDetail: (id) => `/forum/posts/${id}`,
      }}
      tableId="kcosmetics-forum-posts"
    />
  );
}
