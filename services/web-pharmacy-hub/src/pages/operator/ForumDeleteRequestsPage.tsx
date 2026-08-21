/**
 * ForumDeleteRequestsPage — 포럼 삭제 요청 관리 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
 *   공통 @o4o/operator-core-ui/modules/forum-delete-requests thin wrapper.
 *   backend/API 변경 없음. 안내 문구(loadGuideSections) 는 Pharmacy-Hub 가 guide 편집
 *   콘솔을 채택하지 않으므로 주입하지 않는다 (콘솔은 미주입을 그대로 '안내 없음'으로 처리).
 */

import { Trash2 } from 'lucide-react';
import { OperatorForumDeleteRequestsConsolePage } from '@o4o/operator-core-ui/modules/forum-delete-requests';
import type {
  ForumDeleteRequestsConsoleClient,
  ForumDeleteRequest,
} from '@o4o/operator-core-ui/modules/forum-delete-requests';
import { forumOperatorApi } from '../../services/forumApi';

const client: ForumDeleteRequestsConsoleClient = {
  async list({ status }) {
    const res = await forumOperatorApi.getDeleteRequests({ status });
    return (res?.data || []) as ForumDeleteRequest[];
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
      serviceKey="pharmacy-hub"
      client={client}
      title="포럼 삭제 요청 관리"
      description="포럼 소유자의 삭제 요청을 검토하고 승인하거나 반려하세요"
      headerIcon={<Trash2 className="w-7 h-7 text-teal-600" />}
      tableId="pharmacy-hub-forum-delete-requests"
    />
  );
}
