/**
 * ForumDeleteRequestsPage - 포럼 삭제 요청 관리 (KPA-Society)
 *
 * WO-O4O-KPA-A-FORUM-ALIGNMENT-V1 (원본, 공통 /api/v1/forum/operator/* API)
 * WO-O4O-TABLE-STANDARD-V2 / V3 (DataTable + Batch API + ActionBar v2 + BulkResultModal)
 * WO-O4O-KPA-FORUM-DELETE-REQUESTS-CONSOLE-CONVERGENCE-V1:
 *   434-line 직접 구현(DataTable + ActionBar + BulkResultModal + Drawer + GuideBlock)을
 *   @o4o/operator-core-ui/modules/forum-delete-requests 의
 *   OperatorForumDeleteRequestsConsolePage thin wrapper 로 수렴.
 *   GP / K-Cosmetics / Neture 와 동일한 공통 콘솔 구조로 정합.
 *   - bulk: KPA 실제 batch endpoint(batchApproveDelete/batchRejectDelete)를
 *     optional batch-client 로 주입 (per-id fan-out 아님)
 *   - GuideBlock 은 loadGuideSections 로 연결, 응답 shape 는 client adapter 가 정규화
 *   IR: docs/investigations/IR-O4O-KPA-FORUM-MANAGEMENT-TAB-DECOMPOSITION-V1.md (삭제요청 = A 즉시수렴)
 *   backend / API / route / menu / guard 변경 없음.
 *   delete-check hard delete 흐름(카테고리 탭, ForumManagementPage)은 본 WO 범위 외 — 미변경.
 */

import { Trash2 } from 'lucide-react';
import { OperatorForumDeleteRequestsConsolePage } from '@o4o/operator-core-ui/modules/forum-delete-requests';
import type {
  ForumDeleteRequestsConsoleClient,
  ForumDeleteRequest,
} from '@o4o/operator-core-ui/modules/forum-delete-requests';
import { forumOperatorApi } from '../../api/forum';
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
  // KPA 실제 batch endpoint — optional batch-client 경로 (per-id fan-out 아님)
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
      serviceKey="kpa-society"
      client={client}
      title="포럼 삭제 요청 관리"
      description="포럼 소유자의 삭제 요청을 검토하고 승인하거나 반려하세요"
      headerIcon={<Trash2 className="w-7 h-7 text-blue-600" />}
      tableId="kpa-forum-delete-requests"
      loadGuideSections={fetchGuidePageContent}
    />
  );
}
