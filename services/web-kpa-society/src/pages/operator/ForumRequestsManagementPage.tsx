/**
 * ForumRequestsManagementPage - 포럼 개설(생성) 신청 관리 (KPA-Society)
 *
 * WO-O4O-KPA-FORUM-MANAGEMENT-TAB-DECOMPOSITION-V1: 2탭 분해로 신청 관리 단독 화면 분리(원본)
 * WO-O4O-KPA-FORUM-REQUESTS-CONSOLE-CONVERGENCE-WITH-STATE-EXTENSION-V1:
 *   직접 구현(DataTable+RowActionMenu+ActionBar+Drawer)을
 *   @o4o/operator-core-ui/modules/forum-requests 의 OperatorForumRequestsConsolePage
 *   thin wrapper 로 수렴. GP/K-Cosmetics/Neture 와 동일 콘솔 계열로 정합.
 *   KPA 고유 요소는 공통 콘솔의 optional 확장으로 주입 (공통 콘솔 기본 동작 불변):
 *     - 상태머신 creating/completed/failed → statusConfig + statusFilterOptions
 *     - forumType/tags → extraColumns + renderDetailExtra (+ 공통 search 가 tags 매칭)
 *     - failed 복구(recreateForum) → client.recreate + canRecreate (단건 drawer 전용)
 *   backend / API / route / menu / guard 변경 없음. 보완 의견 필수·bulk 승인/거절만 정책은 콘솔 계승.
 *
 * 공통 /api/v1/forum/operator/* API 사용 (forumOperatorApi)
 */

import { FileCheck } from 'lucide-react';
import { OperatorForumRequestsConsolePage } from '@o4o/operator-core-ui/modules/forum-requests';
import type {
  ForumRequestsConsoleClient,
  ForumRequest,
  ForumRequestExtendedStatus,
} from '@o4o/operator-core-ui/modules/forum-requests';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { forumOperatorApi } from '../../api/forum';

// ─── Client adapter (KPA forumOperatorApi → 공통 콘솔 contract) ───
const client: ForumRequestsConsoleClient = {
  async list({ status }) {
    const res = await forumOperatorApi.getRequests({ status });
    return (res.data || []) as ForumRequest[];
  },
  async review(id, data) {
    const res = await forumOperatorApi.review(id, data);
    return res?.success ? { ok: true } : { ok: false, error: res?.error };
  },
  // KPA failed 복구 — optional recreate 경로 (단건 전용). batchReview 는 미보유 → 생략(fan-out).
  async recreate(id) {
    const res = await forumOperatorApi.recreateForum(id);
    return res?.success ? { ok: true } : { ok: false, error: res?.error };
  },
};

// ─── KPA 상태머신 badge config (공통 default 위에 병합 override) ───
const statusConfig: Partial<Record<ForumRequestExtendedStatus, { label: string; color: string; bgColor: string }>> = {
  pending: { label: '대기 중', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  revision_requested: { label: '보완 요청', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  approved: { label: '승인됨', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  creating: { label: '처리 중', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  completed: { label: '승인됨', color: 'text-green-700', bgColor: 'bg-green-100' },
  failed: { label: '생성 실패', color: 'text-red-700', bgColor: 'bg-red-100' },
  rejected: { label: '거부됨', color: 'text-slate-600', bgColor: 'bg-slate-100' },
};

// WO-O4O-FORUM-REQUEST-FLOW-SIMPLIFY-V1: 승인=즉시 생성 — completed/failed 중심 필터.
const statusFilterOptions: { value: ForumRequestExtendedStatus | 'all'; label: string }[] = [
  { value: 'all', label: '모든 상태' },
  { value: 'pending', label: '대기 중' },
  { value: 'revision_requested', label: '보완 요청' },
  { value: 'completed', label: '승인됨' },
  { value: 'failed', label: '생성 실패' },
  { value: 'rejected', label: '거부됨' },
];

// 포럼 유형(공개/비공개) + 태그 — 포럼명 컬럼 뒤 표시 (기존 신청 관리 화면 정보 보존)
const extraColumns: ListColumnDef<ForumRequest>[] = [
  {
    key: 'forumMeta',
    header: '유형/태그',
    render: (_v, row) => (
      <div className="flex items-center gap-1.5 flex-wrap">
        {row.forumType === 'closed' ? (
          <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600">비공개</span>
        ) : (
          <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-600">공개</span>
        )}
        {(row.tags ?? []).slice(0, 2).map((tag) => (
          <span key={tag} className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">{tag}</span>
        ))}
        {(row.tags?.length ?? 0) > 2 && (
          <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500">+{(row.tags!.length) - 2}</span>
        )}
      </div>
    ),
  },
];

// 단건 상세 drawer 추가 정보: 포럼 유형 / 태그 / 생성 오류(failed) / 생성된 슬러그(completed)
const renderDetailExtra = (req: ForumRequest) => (
  <>
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">포럼 유형</p>
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg ${req.forumType === 'closed' ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'}`}>
        {req.forumType === 'closed' ? '비공개 포럼' : '공개 포럼'}
      </span>
    </div>
    {req.tags && req.tags.length > 0 && (
      <div>
        <p className="text-sm font-medium text-slate-500 mb-2">태그</p>
        <div className="flex flex-wrap gap-1.5">
          {req.tags.map((tag) => (
            <span key={tag} className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">{tag}</span>
          ))}
        </div>
      </div>
    )}
    {req.status === 'failed' && req.errorMessage && (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <p className="text-sm font-medium text-red-700 mb-1">생성 오류</p>
        <p className="text-sm text-red-600 font-mono break-all">{req.errorMessage}</p>
      </div>
    )}
    {req.status === 'completed' && req.createdCategorySlug && (
      <div className="p-4 rounded-lg bg-green-50 border border-green-200">
        <p className="text-sm font-medium text-green-700 mb-1">생성된 포럼</p>
        <p className="text-sm text-green-600">슬러그: <span className="font-mono">{req.createdCategorySlug}</span></p>
      </div>
    )}
  </>
);

export default function ForumRequestsManagementPage() {
  return (
    <OperatorForumRequestsConsolePage
      serviceKey="kpa-society"
      client={client}
      title="포럼 신청 관리"
      description="포럼 생성 요청 심사"
      headerIcon={<FileCheck className="w-7 h-7 text-blue-600" />}
      tableId="kpa-forum-requests"
      statusConfig={statusConfig}
      statusFilterOptions={statusFilterOptions}
      extraColumns={extraColumns}
      canRecreate={(item) => item.status === 'failed'}
      recreateActionLabel="재생성"
      renderDetailExtra={renderDetailExtra}
    />
  );
}
