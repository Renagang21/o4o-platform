/**
 * ForumRequestsPage - 포럼 신청(카테고리 생성 요청) 관리 (GlycoPharm)
 *
 * WO-O4O-FORUM-REQUEST-UNIFICATION-PHASE1-V1 (원본)
 * WO-O4O-OPERATOR-FORUM-REQUESTS-CONSOLE-COMMONIZATION-V1:
 *   419-line 구현을 @o4o/operator-core-ui/modules/forum-requests 의
 *   OperatorForumRequestsConsolePage thin wrapper 로 정합.
 *   서비스별 응답 shape 차이(apiClient `{ data, error: { message } }`)는 client adapter 가 흡수.
 *   보완(revision) bulk 제외 + 의견 필수 정책은 콘솔이 계승. backend / API / route 변경 없음.
 */

import { FileCheck } from 'lucide-react';
import { OperatorForumRequestsConsolePage } from '@o4o/operator-core-ui/modules/forum-requests';
import type {
  ForumRequestsConsoleClient,
  ForumRequest,
} from '@o4o/operator-core-ui/modules/forum-requests';
import { forumRequestApi } from '@/services/api';

const client: ForumRequestsConsoleClient = {
  async list({ status }) {
    const res = await forumRequestApi.getAllRequests({ status });
    if (res.error) throw new Error(res.error.message);
    return (res.data || []) as ForumRequest[];
  },
  async review(id, data) {
    const res = await forumRequestApi.review(id, data);
    return res.error ? { ok: false, error: res.error.message } : { ok: true };
  },
};

export default function ForumRequestsPage() {
  return (
    <OperatorForumRequestsConsolePage
      serviceKey="glycopharm"
      client={client}
      title="포럼 신청 관리"
      description="사용자의 포럼 생성 신청을 검토하고 승인하세요"
      headerIcon={<FileCheck className="w-7 h-7 text-primary-600" />}
      tableId="glycopharm-forum-requests"
    />
  );
}
