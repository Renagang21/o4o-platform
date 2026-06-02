/**
 * OperatorForumRequestsConsolePage — 운영자 포럼 신청(카테고리 생성 요청) 관리 wrapper.
 *
 * WO-O4O-OPERATOR-FORUM-REQUESTS-CONSOLE-COMMONIZATION-V1
 *
 * GlycoPharm / K-Cosmetics 의 ForumRequestsPage (95%+ 동일) 통합.
 * IR: docs/investigations/IR-O4O-OPERATOR-FORUM-REQUEST-CONSOLE-WRAPPER-FEASIBILITY-V1.md
 * 선행: WO-O4O-OPERATOR-FORUM-DELETE-REQUESTS-CONSOLE-COMMONIZATION-V1 (동일 패턴).
 *
 * 구조 (각 service 의 ForumRequestsPage 패턴 그대로 추출):
 *   - 헤더 (제목 + 아이콘 + 대기 건수 badge)
 *   - 검색 input + 상태 select (모든/대기/보완/승인/거절)
 *   - ActionBar (bulk: 승인 / 거절 — reviewable 만 대상, 단건 endpoint fan-out)
 *   - BulkResultModal
 *   - DataTable (selectable)
 *   - BaseDetailDrawer (신청 상세 + 단건 승인/거절/보완 + 검토 의견)
 *   - loading / error 전체화면 상태
 *
 * 보완(revision) 정책 (canonical):
 *   - 의견 입력이 필요하므로 bulk action 에서 제외 (ActionBar 는 승인/거절만 노출).
 *   - 단건 drawer 에서만 처리하며, 의견 미입력 시 차단 (GP 기존 정책 계승, K-Cos 에도 동일 적용).
 *
 * backend / API contract 변경 없음 — 응답 shape 차이는 client adapter 가 정규화.
 */

import { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  Clock,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { BaseDetailDrawer, ActionBar, BulkResultModal } from '@o4o/ui';
import { DataTable, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { toast } from '@o4o/error-handling';
import type {
  OperatorForumRequestsConsolePageProps,
  ForumRequest,
  ForumRequestStatus,
} from './types';

// ─── Config ──────────────────────────────────────────────────

type StatusFilter = ForumRequestStatus | 'all';

const STATUS_CONFIG: Record<ForumRequestStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '대기 중', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  revision_requested: { label: '보완 요청', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  approved: { label: '승인됨', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: '거절됨', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const DEFAULT_TITLE = '포럼 신청 관리';
const DEFAULT_DESCRIPTION = '포럼 생성 요청을 검토하고 승인/거절/보완요청하세요';
const DEFAULT_SEARCH_PLACEHOLDER = '포럼명 또는 신청자 검색...';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isReviewable(status: ForumRequestStatus): boolean {
  return status === 'pending' || status === 'revision_requested';
}

// ─── Component ───────────────────────────────────────────────

export function OperatorForumRequestsConsolePage({
  serviceKey,
  client,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  headerIcon,
  searchPlaceholder = DEFAULT_SEARCH_PLACEHOLDER,
  tableId,
}: OperatorForumRequestsConsolePageProps) {
  const [requests, setRequests] = useState<ForumRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedRequest, setSelectedRequest] = useState<ForumRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  // ─── Data ───────────────────────────────────────────────────
  useEffect(() => {
    loadRequests();
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const items = await client.list({ status });
      setRequests(items || []);
    } catch (e: any) {
      setError(e?.message || '신청 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRequests = requests.filter((request) => {
    const q = searchQuery.toLowerCase();
    return (
      request.name.toLowerCase().includes(q) ||
      request.requesterName.toLowerCase().includes(q)
    );
  });

  const pendingCount = requests.filter((r) => isReviewable(r.status)).length;

  // ─── Single-item review ─────────────────────────────────────
  const handleReview = async (action: 'approve' | 'reject' | 'revision') => {
    if (!selectedRequest) return;

    // 보완 요청은 의견 필수 (canonical 정책)
    if (action === 'revision' && !reviewComment.trim()) {
      toast.error('보완 요청 시 의견을 입력해주세요.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await client.review(selectedRequest.id, {
        action,
        reviewComment: reviewComment || undefined,
      });
      if (!res.ok) {
        toast.error(res.error || '처리 실패');
      } else {
        await loadRequests();
        setSelectedRequest(null);
        setReviewComment('');
        toast.success(
          action === 'approve' ? '승인 완료' :
          action === 'reject' ? '거절 완료' :
          '보완 요청 완료',
        );
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Bulk Actions (review fan-out, 보완 제외) ──────────────
  const selectedReviewableCount = [...selectedIds].filter((id) => {
    const r = requests.find((req) => req.id === id);
    return r ? isReviewable(r.status) : false;
  }).length;

  const runBulk = async (action: 'approve' | 'reject') => {
    const targetIds = [...selectedIds].filter((id) => {
      const r = requests.find((req) => req.id === id);
      return r ? isReviewable(r.status) : false;
    });
    if (targetIds.length === 0) return;
    const result = await batch.executeBatch(async (ids) => {
      const settled = await Promise.allSettled(ids.map((id) => client.review(id, { action })));
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
    }, targetIds);
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      loadRequests();
    }
  };

  // ─── Columns ────────────────────────────────────────────────
  const columns: ListColumnDef<ForumRequest>[] = [
    {
      key: 'name',
      header: '포럼명',
      render: (_v, req) => (
        <div>
          <div className="font-medium text-slate-800">{req.name}</div>
          <div className="text-sm text-slate-500 line-clamp-1">{req.description}</div>
        </div>
      ),
    },
    {
      key: 'requesterName',
      header: '신청자',
      render: (_v, req) => (
        <div>
          <div className="text-slate-800">{req.requesterName}</div>
          {req.requesterEmail && <div className="text-sm text-slate-500">{req.requesterEmail}</div>}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: '신청일',
      width: '160px',
      sortable: true,
      sortAccessor: (req) => new Date(req.createdAt).getTime(),
      render: (_v, req) => <span className="text-sm text-slate-600">{formatDate(req.createdAt)}</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '120px',
      render: (_v, req) => {
        const s = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
        return (
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${s.bgColor} ${s.color}`}>
            {s.label}
          </span>
        );
      },
    },
  ];

  // ─── Loading / Error 전체화면 ──────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
        <span className="ml-2 text-slate-600">로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="mt-4 text-red-600">{error}</p>
        <button
          onClick={loadRequests}
          className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {headerIcon ?? <FileCheck className="w-7 h-7 text-slate-600" />}
            {title}
          </h1>
          <p className="text-slate-500 mt-1">{description}</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="font-medium">{pendingCount}건의 대기 중인 신청</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="pl-4 pr-8 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 appearance-none bg-white"
          >
            <option value="all">모든 상태</option>
            <option value="pending">대기 중</option>
            <option value="revision_requested">보완 요청</option>
            <option value="approved">승인됨</option>
            <option value="rejected">거절됨</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Bulk ActionBar + 결과 모달 (승인/거절만 — 보완 제외) */}
      <ActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          {
            key: 'approve',
            label: `승인 (${selectedReviewableCount})`,
            onClick: () => runBulk('approve'),
            variant: 'primary' as const,
            icon: <CheckCircle size={14} />,
            loading: batch.loading,
            group: 'actions',
            tooltip: '선택된 신청을 일괄 승인합니다',
            visible: selectedReviewableCount > 0,
          },
          {
            key: 'reject',
            label: `거절 (${selectedReviewableCount})`,
            onClick: () => runBulk('reject'),
            variant: 'danger' as const,
            icon: <XCircle size={14} />,
            loading: batch.loading,
            group: 'actions',
            tooltip: '선택된 신청을 일괄 거절합니다',
            visible: selectedReviewableCount > 0,
          },
        ]}
      />

      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); loadRequests(); }}
        result={batch.result}
        onRetry={() => { batch.retryFailed(); }}
      />

      {/* DataTable */}
      <DataTable<ForumRequest>
        columns={columns}
        data={filteredRequests}
        rowKey="id"
        loading={isLoading}
        onRowClick={(req) => { setSelectedRequest(req); setReviewComment(''); }}
        emptyMessage="검색 조건에 맞는 신청이 없습니다"
        tableId={tableId ?? `${serviceKey}-forum-requests`}
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Detail Drawer (단건 승인/거절/보완) */}
      <BaseDetailDrawer
        open={!!selectedRequest}
        onClose={() => { setSelectedRequest(null); setReviewComment(''); }}
        title={selectedRequest?.name ?? ''}
        width={560}
        actions={
          selectedRequest && isReviewable(selectedRequest.status)
            ? [
                { label: '보완', onClick: () => handleReview('revision'), variant: 'default' as const, loading: isProcessing, disabled: isProcessing },
                { label: '거절', onClick: () => handleReview('reject'), variant: 'danger' as const, loading: isProcessing, disabled: isProcessing },
                { label: '승인', onClick: () => handleReview('approve'), variant: 'primary' as const, loading: isProcessing, disabled: isProcessing },
              ]
            : []
        }
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">포럼 설명</p>
              <p className="text-slate-800">{selectedRequest.description}</p>
            </div>

            {selectedRequest.reason && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">신청 사유</p>
                <p className="text-slate-800">{selectedRequest.reason}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">신청자</p>
                <p className="text-slate-800">{selectedRequest.requesterName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">신청일</p>
                <p className="text-slate-800">{formatDate(selectedRequest.createdAt)}</p>
              </div>
            </div>

            {isReviewable(selectedRequest.status) && (
              <div className="pt-4 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  검토 의견
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="승인/거절/보완 사유를 입력하세요 (보완 요청 시 필수)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 resize-none"
                />
              </div>
            )}

            {!isReviewable(selectedRequest.status) && selectedRequest.reviewComment && (
              <div className={`p-4 rounded-lg ${
                selectedRequest.status === 'approved' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <h4 className={`text-sm font-medium mb-1 ${
                  selectedRequest.status === 'approved' ? 'text-green-700' : 'text-red-700'
                }`}>
                  검토 의견
                </h4>
                <p className={
                  selectedRequest.status === 'approved' ? 'text-green-600' : 'text-red-600'
                }>
                  {selectedRequest.reviewComment}
                </p>
                {selectedRequest.reviewedAt && (
                  <p className="text-xs text-slate-500 mt-2">
                    {selectedRequest.reviewerName} | {formatDate(selectedRequest.reviewedAt)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}
