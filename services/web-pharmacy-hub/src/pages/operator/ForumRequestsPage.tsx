/**
 * ForumRequestsPage — 포럼 신청(개설 요청) 관리 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
 *   공통 @o4o/operator-core-ui/modules/forum-requests thin wrapper.
 *   `forum_category_requests` → 운영자 검토가 **포럼이 생기는 유일한 경로**이므로
 *   이 콘솔 부재는 표시 문제가 아니라 기능 부재였다. backend/API 변경 없음.
 */

import { FileCheck } from 'lucide-react';
import { OperatorForumRequestsConsolePage } from '@o4o/operator-core-ui/modules/forum-requests';
import type {
  ForumRequestsConsoleClient,
  ForumRequest,
} from '@o4o/operator-core-ui/modules/forum-requests';
import { forumOperatorApi } from '../../services/forumApi';

const client: ForumRequestsConsoleClient = {
  async list({ status }) {
    const res = await forumOperatorApi.getRequests({ status });
    return (res?.data || []) as ForumRequest[];
  },
  async review(id, data) {
    const res = await forumOperatorApi.review(id, data);
    return res?.success ? { ok: true } : { ok: false, error: res?.error };
  },
};

export default function ForumRequestsPage() {
  return (
    <OperatorForumRequestsConsolePage
      serviceKey="pharmacy-hub"
      client={client}
      title="포럼 신청 관리"
      description="포럼 개설 요청을 검토하고 승인/거절/보완요청하세요"
      headerIcon={<FileCheck className="w-7 h-7 text-teal-600" />}
      tableId="pharmacy-hub-forum-requests"
    />
  );
}
