/**
 * OperatorForumDeleteRequestsConsolePage — 운영자 포럼 삭제 요청 관리 wrapper.
 *
 * WO-O4O-OPERATOR-FORUM-DELETE-REQUESTS-CONSOLE-COMMONIZATION-V1
 *
 * GlycoPharm / K-Cosmetics 의 ForumDeleteRequestsPage (95%+ 동일) 통합.
 * IR: docs/investigations/IR-O4O-OPERATOR-FORUM-REQUEST-CONSOLE-WRAPPER-FEASIBILITY-V1.md
 *
 * 구조 (각 service 의 ForumDeleteRequestsPage 패턴 그대로 추출):
 *   - 헤더 (제목 + 아이콘 + 대기 건수 badge)
 *   - GuideBlock (옵션 동적 콘텐츠 + fallback)
 *   - 상태 탭 (대기/승인/반려/전체 — segmented canonical)
 *   - ActionBar (bulk: 삭제 승인 / 반려 — pending 만 대상, 단건 endpoint fan-out)
 *   - BulkResultModal
 *   - DataTable (selectable)
 *   - BaseDetailDrawer (삭제 요청 상세 + 단건 승인/반려 + 검토 의견)
 *
 * 위험 작업(승인=비활성화) confirm 은 기존과 동일하게 drawer/ActionBar 흐름 + postCount 경고로 유지.
 * backend / API contract 변경 없음 — 응답 shape 차이는 client adapter 가 정규화.
 */

import { useState, useEffect } from 'react';
import { Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { BaseDetailDrawer, ActionBar, BulkResultModal } from '@o4o/ui';
import { DataTable, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { toast } from '@o4o/error-handling';
import { GuideBlock } from '@o4o/shared-space-ui';
import type {
  OperatorForumDeleteRequestsConsolePageProps,
  ForumDeleteRequest,
  ForumDeleteRequestStatus,
} from './types';

// ─── Config ──────────────────────────────────────────────────

type StatusFilter = ForumDeleteRequestStatus | 'all';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'pending', label: '대기 중' },
  { value: 'approved', label: '승인됨' },
  { value: 'rejected', label: '반려됨' },
  { value: 'all', label: '전체' },
];

const STATUS_CONFIG: Record<ForumDeleteRequestStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '대기 중', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  approved: { label: '승인됨', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: '반려됨', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const DEFAULT_TITLE = '포럼 삭제 요청 관리';
const DEFAULT_DESCRIPTION = '포럼 소유자의 삭제 요청을 검토하고 승인하거나 반려하세요';
const DEFAULT_GUIDE_PAGE_KEY = 'forum.request.management';

const GUIDE_FALLBACK = {
  title: '포럼 삭제 요청을 검토합니다.',
  description: '포럼 소유자의 삭제 요청을 승인하거나 반려합니다. 검토 의견을 함께 작성할 수 있습니다.',
  steps: [
    '대기 중인 삭제 요청 목록을 확인합니다',
    '요청 상세 내용과 사유를 검토합니다',
    '승인 또는 반려를 선택하고 의견을 작성합니다',
    '처리 결과는 포럼 소유자에게 반영됩니다',
  ],
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Component ───────────────────────────────────────────────

export function OperatorForumDeleteRequestsConsolePage({
  serviceKey,
  client,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  headerIcon,
  tableId,
  loadGuideSections,
  guidePageKey = DEFAULT_GUIDE_PAGE_KEY,
}: OperatorForumDeleteRequestsConsolePageProps) {
  const [requests, setRequests] = useState<ForumDeleteRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [selectedRequest, setSelectedRequest] = useState<ForumDeleteRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [guideTitle, setGuideTitle] = useState<string | null>(null);
  const [guideDesc, setGuideDesc] = useState<string | null>(null);
  const [guideSteps, setGuideSteps] = useState<string[] | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  // ─── Guide (optional dynamic content) ──────────────────────
  useEffect(() => {
    if (!loadGuideSections) return;
    let cancelled = false;
    loadGuideSections(serviceKey, guidePageKey)
      .then((sections) => {
        if (cancelled) return;
        const raw = sections?.['guideblock-page-help'];
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.title) setGuideTitle(parsed.title);
          if (parsed.description) setGuideDesc(parsed.description);
          if (Array.isArray(parsed.steps)) setGuideSteps(parsed.steps);
        } catch { /* use fallback */ }
      })
      .catch(() => { /* use fallback */ });
    return () => { cancelled = true; };
  }, [loadGuideSections, serviceKey, guidePageKey]);

  // ─── Data ───────────────────────────────────────────────────
  useEffect(() => {
    loadRequests();
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const items = await client.list({ status });
      setRequests(items || []);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingCount = requests.filter((r) => r.deleteRequestStatus === 'pending').length;

  // ─── Single-item review ─────────────────────────────────────
  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      const fn = action === 'approve' ? client.approve : client.reject;
      const res = await fn(selectedRequest.id, { reviewComment: reviewComment.trim() || undefined });
      if (!res.ok) {
        toast.error(res.error || '처리 실패');
      } else {
        await loadRequests();
        setSelectedRequest(null);
        setReviewComment('');
        toast.success(action === 'approve' ? '삭제 승인 완료' : '반려 완료');
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Bulk Actions (pending 만, 단건 endpoint fan-out) ───────
  const selectedPendingCount = [...selectedIds].filter((id) => {
    const r = requests.find((req) => req.id === id);
    return r?.deleteRequestStatus === 'pending';
  }).length;

  const runBulk = async (action: 'approve' | 'reject') => {
    const pendingIds = [...selectedIds].filter((id) => {
      const r = requests.find((req) => req.id === id);
      return r?.deleteRequestStatus === 'pending';
    });
    if (pendingIds.length === 0) return;
    const fn = action === 'approve' ? client.approve : client.reject;
    const data = action === 'reject' ? { reviewComment: '일괄 반려' } : undefined;
    const result = await batch.executeBatch(async (ids) => {
      const settled = await Promise.allSettled(ids.map((id) => fn(id, data)));
      return {
        data: {
          results: settled.map((r, i) => {
            if (r.status === 'rejected') {
              return { id: ids[i], status: 'failed' as const, error: (r.reason as any)?.message || '오류' };
            }
            if (!r.value.ok) {
              return { id: ids[i], status: 'failed' as const, error: r.value.error || '처리 실패' };
            }
            return { id: ids[i], status: 'success' as const };
          }),
        },
      };
    }, pendingIds);
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      loadRequests();
    }
  };

  // ─── Columns ────────────────────────────────────────────────
  const columns: ListColumnDef<ForumDeleteRequest>[] = [
    {
      key: 'name',
      header: '포럼명',
      render: (_v, req) => (
        <div>
          <div className="font-medium text-slate-800">{req.name}</div>
          {req.description && (
            <div className="text-sm text-slate-500 line-clamp-1">{req.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'creatorName',
      header: '생성자',
      width: '120px',
      render: (_v, req) => (
        <span className="text-slate-800">{req.creatorName || req.createdBy.slice(0, 8)}</span>
      ),
    },
    {
      key: 'postCount',
      header: '게시글',
      width: '80px',
      render: (_v, req) => <span className="text-slate-600">{req.postCount}</span>,
    },
    {
      key: 'deleteRequestedAt',
      header: '요청일',
      width: '160px',
      sortable: true,
      sortAccessor: (req) => new Date(req.deleteRequestedAt).getTime(),
      render: (_v, req) => (
        <span className="text-sm text-slate-600">{formatDate(req.deleteRequestedAt)}</span>
      ),
    },
    {
      key: 'deleteRequestStatus',
      header: '상태',
      width: '100px',
      render: (_v, req) => {
        const s = STATUS_CONFIG[req.deleteRequestStatus] || STATUS_CONFIG.pending;
        return (
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${s.bgColor} ${s.color}`}>
            {s.label}
          </span>
        );
      },
    },
  ];

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {headerIcon ?? <Trash2 className="w-7 h-7 text-slate-600" />}
            {title}
          </h1>
          <p className="text-slate-500 mt-1">{description}</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="font-medium">{pendingCount}건 대기 중</span>
          </div>
        )}
      </div>

      {/* GuideBlock */}
      <GuideBlock
        variant="info"
        title={guideTitle ?? GUIDE_FALLBACK.title}
        description={guideDesc ?? GUIDE_FALLBACK.description}
        steps={guideSteps ?? GUIDE_FALLBACK.steps}
        compact
      />

      {/* Status Tabs (segmented canonical) */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              statusFilter === tab.value
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk ActionBar + 결과 모달 */}
      <ActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          {
            key: 'approve',
            label: `삭제 승인 (${selectedPendingCount})`,
            onClick: () => runBulk('approve'),
            variant: 'primary' as const,
            icon: <CheckCircle size={14} />,
            loading: batch.loading,
            group: 'actions',
            tooltip: '선택된 삭제 요청을 일괄 승인합니다',
            visible: selectedPendingCount > 0,
          },
          {
            key: 'reject',
            label: `반려 (${selectedPendingCount})`,
            onClick: () => runBulk('reject'),
            variant: 'danger' as const,
            icon: <XCircle size={14} />,
            loading: batch.loading,
            group: 'actions',
            tooltip: '선택된 삭제 요청을 일괄 반려합니다',
            visible: selectedPendingCount > 0,
          },
        ]}
      />

      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); loadRequests(); }}
        result={batch.result}
        onRetry={() => { batch.retryFailed(); }}
      />

      <DataTable<ForumDeleteRequest>
        columns={columns}
        data={requests}
        rowKey="id"
        loading={isLoading}
        onRowClick={(req) => { setSelectedRequest(req); setReviewComment(''); }}
        emptyMessage="해당 상태의 삭제 요청이 없습니다"
        tableId={tableId ?? `${serviceKey}-forum-delete-requests`}
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <BaseDetailDrawer
        open={!!selectedRequest}
        onClose={() => { setSelectedRequest(null); setReviewComment(''); }}
        title={selectedRequest?.name ?? ''}
        width={560}
        actions={
          selectedRequest?.deleteRequestStatus === 'pending'
            ? [
                { label: '반려', onClick: () => handleReview('reject'), variant: 'danger' as const, loading: isProcessing, disabled: isProcessing },
                { label: '삭제 승인', onClick: () => handleReview('approve'), variant: 'primary' as const, loading: isProcessing, disabled: isProcessing },
              ]
            : []
        }
      >
        {selectedRequest && (
          <div className="space-y-4">
            {selectedRequest.description && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">포럼 설명</p>
                <p className="text-slate-800">{selectedRequest.description}</p>
              </div>
            )}

            {selectedRequest.deleteRequestReason && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">삭제 사유</p>
                <p className="text-slate-800">{selectedRequest.deleteRequestReason}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">생성자</p>
                <p className="text-slate-800">
                  {selectedRequest.creatorName || selectedRequest.createdBy.slice(0, 8)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">게시글 수</p>
                <p className="text-slate-800">{selectedRequest.postCount}</p>
              </div>
            </div>

            {selectedRequest.postCount > 0 && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-amber-700 text-sm">
                  이 포럼에는 {selectedRequest.postCount}개의 게시글이 있습니다. 삭제 승인 시 포럼이 비활성화됩니다.
                </p>
              </div>
            )}

            {selectedRequest.deleteRequestStatus === 'pending' && (
              <div className="pt-4 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  검토 의견 <span className="text-slate-400 font-normal">(선택)</span>
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="승인 또는 반려 사유를 입력하세요 (선택)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 resize-none"
                />
              </div>
            )}

            {selectedRequest.deleteRequestStatus !== 'pending' && selectedRequest.deleteReviewComment && (
              <div className={`p-4 rounded-lg ${
                selectedRequest.deleteRequestStatus === 'approved' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <h4 className={`text-sm font-medium mb-1 ${
                  selectedRequest.deleteRequestStatus === 'approved' ? 'text-green-700' : 'text-red-700'
                }`}>
                  검토 의견
                </h4>
                <p className={
                  selectedRequest.deleteRequestStatus === 'approved' ? 'text-green-600' : 'text-red-600'
                }>
                  {selectedRequest.deleteReviewComment}
                </p>
                {selectedRequest.deleteReviewedAt && (
                  <p className="text-xs text-slate-500 mt-2">{formatDate(selectedRequest.deleteReviewedAt)}</p>
                )}
              </div>
            )}
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}
