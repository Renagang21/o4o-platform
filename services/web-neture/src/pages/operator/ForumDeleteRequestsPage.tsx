/**
 * ForumDeleteRequestsPage - 포럼 삭제 요청 관리 (Neture)
 *
 * WO-O4O-FORUM-OPERATOR-UNIFICATION-V1 (원본)
 * WO-O4O-NETURE-FORUM-CONSOLE-CONVERGENCE-APPLY-V1:
 *   477-line 직접 구현(DataTable + 중앙 Modal + ActionBar + batchApprove/RejectDelete)을
 *   @o4o/operator-core-ui/modules/forum-delete-requests 의
 *   OperatorForumDeleteRequestsConsolePage thin wrapper 로 수렴.
 *   - 상세 UI: 중앙 Modal → 공통 BaseDetailDrawer (UX 표준화)
 *   - 진입: Eye 버튼 → row-click (UX 표준화)
 *   - bulk: Neture 실제 batch endpoint(batchApproveDelete/batchRejectDelete)를
 *     optional batch-client 로 주입 (fan-out 아님)
 *   - GuideBlock 은 loadGuideSections 로 연결, 응답 shape 는 client adapter 가 정규화
 *   backend / API / route / menu / guard 변경 없음.
 */

import { Trash2 } from 'lucide-react';
import { OperatorForumDeleteRequestsConsolePage } from '@o4o/operator-core-ui/modules/forum-delete-requests';
import type {
  ForumDeleteRequestsConsoleClient,
  ForumDeleteRequest,
} from '@o4o/operator-core-ui/modules/forum-delete-requests';
import { forumOperatorApi } from '../../services/forumApi';
import { fetchGuidePageContent } from '../../api/guideContent';

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
  // Neture 실제 batch endpoint — optional batch-client 경로 (per-id fan-out 아님)
  batchApprove(ids, data) {
    return forumOperatorApi.batchApproveDelete(ids, data?.reviewComment);
  },
  batchReject(ids, data) {
    return forumOperatorApi.batchRejectDelete(ids, data?.reviewComment);
  },
};

export default function ForumDeleteRequestsPage() {
  return (
    <OperatorForumDeleteRequestsConsolePage
      serviceKey="neture"
      client={client}
      title="포럼 삭제 요청 관리"
      description="포럼 소유자의 삭제 요청을 검토하고 승인하거나 반려하세요"
      headerIcon={<Trash2 className="w-7 h-7 text-emerald-600" />}
      tableId="neture-forum-delete-requests"
      loadGuideSections={fetchGuidePageContent}
    />
  );
}
