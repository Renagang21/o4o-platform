/**
 * ForumManagementPage - 포럼 신청(카테고리 생성 요청) 관리 (Neture)
 *
 * WO-O4O-FORUM-OPERATOR-UNIFICATION-V1 (원본)
 * WO-O4O-NETURE-FORUM-CONSOLE-CONVERGENCE-APPLY-V1:
 *   468-line 직접 구현(DataTable + 중앙 Modal + ActionBar + batchReview)을
 *   @o4o/operator-core-ui/modules/forum-requests 의 OperatorForumRequestsConsolePage
 *   thin wrapper 로 수렴.
 *   - 상세 UI: 중앙 Modal → 공통 BaseDetailDrawer (UX 표준화)
 *   - 진입: Eye 버튼 → row-click (UX 표준화)
 *   - bulk: Neture 실제 batch endpoint(batchReview)를 optional batch-client 로 주입 (fan-out 아님)
 *   - 응답 shape { success, data, error } 는 client adapter 가 정규화
 *   backend / API / route / menu / guard 변경 없음.
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
    return (res.data || []) as ForumRequest[];
  },
  async review(id, data) {
    const res = await forumOperatorApi.review(id, data);
    return res?.success ? { ok: true } : { ok: false, error: res?.error };
  },
  // Neture 실제 batch endpoint — optional batch-client 경로 (per-id fan-out 아님)
  batchReview(ids, action) {
    return forumOperatorApi.batchReview(ids, action);
  },
};

export default function ForumManagementPage() {
  return (
    <OperatorForumRequestsConsolePage
      serviceKey="neture"
      client={client}
      title="포럼 신청 관리"
      description="포럼 생성 요청을 검토하고 승인/거절/보완요청하세요"
      headerIcon={<FileCheck className="w-7 h-7 text-emerald-600" />}
      tableId="neture-forum-requests"
    />
  );
}
