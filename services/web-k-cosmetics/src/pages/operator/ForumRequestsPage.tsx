/**
 * ForumRequestsPage - 포럼 신청(카테고리 생성 요청) 관리 (K-Cosmetics)
 *
 * WO-O4O-FORUM-OPERATOR-UNIFICATION-V1 (원본, 공통 /api/v1/forum/operator/* API)
 * WO-O4O-OPERATOR-FORUM-REQUESTS-CONSOLE-COMMONIZATION-V1:
 *   407-line 구현을 @o4o/operator-core-ui/modules/forum-requests 의
 *   OperatorForumRequestsConsolePage thin wrapper 로 정합.
 *   서비스별 응답 shape 차이(axios `{ success, error }`)는 client adapter 가 흡수.
 *   보완(revision) bulk 제외 + 의견 필수 정책은 콘솔이 계승. backend / API / route 변경 없음.
 */

import { FileCheck } from 'lucide-react';
import { OperatorForumRequestsConsolePage } from '@o4o/operator-core-ui/modules/forum-requests';
import type {
  ForumRequestsConsoleClient,
  ForumRequest,
} from '@o4o/operator-core-ui/modules/forum-requests';
import { forumOperatorApi } from '@/services/forumApi';

const client: ForumRequestsConsoleClient = {
  async list({ status }) {
    const res = await forumOperatorApi.getRequests({ status });
    return (res.data || []) as ForumRequest[];
  },
  async review(id, data) {
    const res = await forumOperatorApi.review(id, data);
    return res?.success ? { ok: true } : { ok: false, error: res?.error };
  },
};

export default function ForumRequestsPage() {
  return (
    <OperatorForumRequestsConsolePage
      serviceKey="k-cosmetics"
      client={client}
      title="포럼 신청 관리"
      description="포럼 생성 요청을 검토하고 승인/거절/보완요청하세요"
      headerIcon={<FileCheck className="w-7 h-7 text-pink-600" />}
      tableId="kcos-forum-requests"
    />
  );
}
