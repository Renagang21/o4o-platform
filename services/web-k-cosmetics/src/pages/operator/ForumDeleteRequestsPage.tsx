/**
 * ForumDeleteRequestsPage - 포럼 삭제 요청 관리 (K-Cosmetics)
 *
 * WO-O4O-FORUM-OPERATOR-UNIFICATION-V1 (원본, 공통 /api/v1/forum/operator/* API)
 * WO-O4O-OPERATOR-FORUM-DELETE-REQUESTS-CONSOLE-COMMONIZATION-V1:
 *   321-line 구현을 @o4o/operator-core-ui/modules/forum-delete-requests 의
 *   OperatorForumDeleteRequestsConsolePage thin wrapper 로 정합.
 *   서비스별 응답 shape 차이(axios `{ success, error }`)는 client adapter 가 흡수.
 *   backend / API / route 변경 없음.
 */

import { Trash2 } from 'lucide-react';
import { OperatorForumDeleteRequestsConsolePage } from '@o4o/operator-core-ui/modules/forum-delete-requests';
import type {
  ForumDeleteRequestsConsoleClient,
  ForumDeleteRequest,
} from '@o4o/operator-core-ui/modules/forum-delete-requests';
import { forumOperatorApi } from '@/services/forumApi';
import { fetchGuidePageContent } from '@/api/guideContent';

const client: ForumDeleteRequestsConsoleClient = {
  async list({ status }) {
    const res = await forumOperatorApi.getDeleteRequests({ status });
    return (res.data || []) as ForumDeleteRequest[];
  },
  async approve(id, data) {
    const res = await forumOperatorApi.approveDelete(id, data);
    return res?.success ? { ok: true } : { ok: false, error: res?.error };
  },
  async reject(id, data) {
    const res = await forumOperatorApi.rejectDelete(id, data);
    return res?.success ? { ok: true } : { ok: false, error: res?.error };
  },
};

export default function ForumDeleteRequestsPage() {
  return (
    <OperatorForumDeleteRequestsConsolePage
      serviceKey="k-cosmetics"
      client={client}
      title="포럼 삭제 요청 관리"
      description="포럼 소유자의 삭제 요청을 검토하고 승인하거나 반려하세요"
      headerIcon={<Trash2 className="w-7 h-7 text-pink-600" />}
      tableId="kcos-forum-delete-requests"
      loadGuideSections={fetchGuidePageContent}
    />
  );
}
