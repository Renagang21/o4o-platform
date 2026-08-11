/**
 * OperatorForumPage — GlycoPharm Operator 포럼 운영 허브 (read-only)
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-FORUM-HUB-READONLY-INTRODUCE-V1:
 *   @o4o/operator-core-ui/modules/forum-hub 의 OperatorForumHubPage 도입.
 *   서비스 operator 는 community post 삭제 권한이 없으므로(IR feasibility) read-only —
 *   enablePostActions 미설정(false): 게시글 수정/단건·일괄 삭제 미노출.
 *   nav 는 GP 실제 route 로 주입 (포럼 관리 → /operator/forum-requests).
 *   backend/API/DB 변경 없음 — analytics summary + community posts read 만 사용.
 */

import { OperatorForumHubPage } from '@o4o/operator-core-ui/modules/forum-hub';
import type { ForumHubClient } from '@o4o/operator-core-ui/modules/forum-hub';
import { forumAnalyticsApi } from '@/services/api';
import { fetchForumPosts } from '@/services/forumApi';

const client: ForumHubClient = {
  // WO-O4O-GLYCOPHARM-API-WRAPPER-FAILURE-CONTRACT-CLOSEOUT-BATCH-V1:
  //   wrapper 는 실패를 { error } 로 반환하므로 adapter 에서 throw 로 승격해야
  //   OperatorForumHubPage 의 error 상태가 동작한다 (조회 실패 ≠ 데이터 0건).
  getSummary: async () => {
    const res = await forumAnalyticsApi.getSummary();
    if ((res as { error?: { message?: string } })?.error) {
      throw new Error((res as { error?: { message?: string } }).error?.message || '포럼 요약을 불러오지 못했습니다.');
    }
    return res;
  },
  getPosts: (params) => fetchForumPosts({ limit: params?.limit }).then((r) => ({ data: r.data })),
};

export default function OperatorForumPage() {
  return (
    <OperatorForumHubPage
      client={client}
      accent={{ iconColor: '#0d9488', iconBgColor: '#ccfbf1' }}
      nav={{
        requests: '/operator/forum-requests',
        categories: '/operator/forum-categories',
        deleteRequests: '/operator/forum-delete-requests',
        analytics: '/operator/forum-analytics',
        community: '/operator/community',
        postDetail: (id) => `/forum/posts/${id}`,
      }}
      tableId="glycopharm-forum-posts"
    />
  );
}
