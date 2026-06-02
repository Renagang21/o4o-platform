/**
 * ForumDeleteRequestsPage - 포럼 삭제 요청 관리 (GlycoPharm)
 *
 * WO-O4O-FORUM-DELETE-REQUEST-V1 (원본)
 * WO-O4O-OPERATOR-FORUM-DELETE-REQUESTS-CONSOLE-COMMONIZATION-V1:
 *   311-line 구현을 @o4o/operator-core-ui/modules/forum-delete-requests 의
 *   OperatorForumDeleteRequestsConsolePage thin wrapper 로 정합.
 *   서비스별 응답 shape 차이(apiClient `{ data, error: { message } }`)는 client adapter 가 흡수.
 *   backend / API / route 변경 없음.
 */

import { Trash2 } from 'lucide-react';
import { OperatorForumDeleteRequestsConsolePage } from '@o4o/operator-core-ui/modules/forum-delete-requests';
import type {
  ForumDeleteRequestsConsoleClient,
  ForumDeleteRequest,
} from '@o4o/operator-core-ui/modules/forum-delete-requests';
import { forumDeleteRequestApi } from '@/services/api';
import { fetchGuidePageContent } from '@/api/guideContent';

const client: ForumDeleteRequestsConsoleClient = {
  async list({ status }) {
    const res = await forumDeleteRequestApi.getAll({ status });
    return (res.data || []) as ForumDeleteRequest[];
  },
  async approve(id, data) {
    const res = await forumDeleteRequestApi.approve(id, { reviewComment: data?.reviewComment });
    return res.error ? { ok: false, error: res.error.message } : { ok: true };
  },
  async reject(id, data) {
    const res = await forumDeleteRequestApi.reject(id, { reviewComment: data?.reviewComment });
    return res.error ? { ok: false, error: res.error.message } : { ok: true };
  },
};

export default function ForumDeleteRequestsPage() {
  return (
    <OperatorForumDeleteRequestsConsolePage
      serviceKey="glycopharm"
      client={client}
      title="포럼 삭제 요청 관리"
      description="포럼 소유자의 삭제 요청을 검토하고 승인/반려합니다"
      headerIcon={<Trash2 className="w-7 h-7 text-red-500" />}
      tableId="glycopharm-forum-delete-requests"
      loadGuideSections={fetchGuidePageContent}
    />
  );
}
