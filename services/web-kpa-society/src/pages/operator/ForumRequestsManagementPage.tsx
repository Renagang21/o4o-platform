/**
 * ForumRequestsManagementPage - 포럼 개설(생성) 신청 관리
 *
 * WO-O4O-KPA-FORUM-MANAGEMENT-TAB-DECOMPOSITION-V1:
 *   기존 ForumManagementPage(1449L, 신청+포럼목록 2탭 결합)의 "신청 관리" 탭을
 *   단독 화면으로 분리. 기능/상태머신/액션은 그대로 보존 (구조 분해 작업, 기능 변경 아님).
 *   - 공통 OperatorForumRequestsConsolePage 치환은 후속 WO 범위 — 본 WO에서는 적용하지 않음.
 *   - creating/completed/failed 상태 + recreateForum 복구 액션 등 KPA 상태머신 보존.
 *
 * 원본 WO 계보:
 *   WO-O4O-KPA-A-FORUM-ALIGNMENT-V1 / WO-O4O-FORUM-REQUEST-FLOW-SIMPLIFY-V1
 *   WO-KPA-OPERATOR-FORUM-REQUESTS-TABLE-COMPLIANCE-V1 / WO-O4O-KPA-OPERATOR-PARTIAL-CANONICAL-ALIGN-V1
 *
 * 공통 /api/v1/forum/operator/* API 사용 (forumOperatorApi)
 */

import { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { RowActionMenu, ActionBar, BulkResultModal, BaseDetailDrawer } from '@o4o/ui';
import { DataTable, defineActionPolicy, buildRowActions, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { forumOperatorApi } from '../../api/forum';

type CategoryRequestStatus =
  | 'pending'
  | 'revision_requested'
  | 'approved'
  | 'creating'
  | 'completed'
  | 'failed'
  | 'rejected';

interface RequestData {
  id: string;
  name: string;
  description: string;
  reason?: string;
  forumType?: string;
  tags?: string[];
  status: CategoryRequestStatus;
  serviceCode: string;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdCategoryId?: string;
  createdCategorySlug?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// WO-O4O-FORUM-REQUEST-FLOW-SIMPLIFY-V1: 승인=즉시 포럼 생성으로 단순화
const statusConfig: Record<CategoryRequestStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '대기 중', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  revision_requested: { label: '보완 요청', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  approved: { label: '승인됨', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  creating: { label: '처리 중', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  completed: { label: '승인됨', color: 'text-green-700', bgColor: 'bg-green-100' },
  failed: { label: '생성 실패', color: 'text-red-700', bgColor: 'bg-red-100' },
  rejected: { label: '거부됨', color: 'text-slate-600', bgColor: 'bg-slate-100' },
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

// WO-KPA-OPERATOR-FORUM-REQUESTS-TABLE-COMPLIANCE-V1: 신청일은 날짜만
function formatDateOnly(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function isReviewable(status: string): boolean {
  return status === 'pending' || status === 'revision_requested';
}

function canRecreateForum(status: string): boolean {
  return status === 'failed';
}

// ─── Action Policy ───

// WO-O4O-FORUM-REQUEST-FLOW-SIMPLIFY-V1: createForum 제거 (승인 시 자동 생성)
const forumRequestPolicy = defineActionPolicy<RequestData>('kpa:forum:requests', {
  rules: [
    {
      key: 'recreateForum',
      label: '재생성',
      variant: 'warning',
      visible: (row) => canRecreateForum(row.status),
    },
    {
      key: 'review',
      label: '상세보기',
    },
  ],
});

const REQUEST_ACTION_ICONS: Record<string, React.ReactNode> = {
  recreateForum: <RefreshCw className="w-4 h-4" />,
  review: <Eye className="w-4 h-4" />,
};

// ─── Component ───

export default function ForumRequestsManagementPage() {
  // ── Forum creation requests state ──
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CategoryRequestStatus | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [creatingRequestId, setCreatingRequestId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string>('');

  // WO-KPA-OPERATOR-FORUM-REQUESTS-TABLE-COMPLIANCE-V1: 신청 관리 selection
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());

  const batch = useBatchAction();

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const result = await forumOperatorApi.getRequests({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setRequests(result.data || []);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = r.name.toLowerCase().includes(q) || r.requesterName.toLowerCase().includes(q);
    const tq = tagFilter.toLowerCase();
    const matchesTag = !tq || (r.tags || []).some((t) => t.toLowerCase().includes(tq));
    return matchesSearch && matchesTag;
  });

  const pendingCount = requests.filter((r) => isReviewable(r.status)).length;

  // WO-KPA-OPERATOR-FORUM-REQUESTS-TABLE-COMPLIANCE-V1: filter 변경 시 selection 초기화
  useEffect(() => { setSelectedRequestIds(new Set()); }, [searchQuery, statusFilter, tagFilter]);

  // WO-KPA-OPERATOR-FORUM-REQUESTS-TABLE-COMPLIANCE-V1: bulk 승인/거부.
  // WO-O4O-KPA-OPERATOR-PARTIAL-CANONICAL-ALIGN-V1:
  //   기존 raw Promise.allSettled + toast → batch.executeBatch + BulkResultModal.
  //   신규 bulk endpoint 신설 금지 — 기존 단건 review API wrap.
  const runRequestBulk = async (action: 'approve' | 'reject') => {
    const ids = [...selectedRequestIds].filter((id) => {
      const row = requests.find((r) => r.id === id);
      return row ? isReviewable(row.status) : false;
    });
    if (ids.length === 0) {
      toast.error('처리할 수 있는 대기 항목이 선택되지 않았습니다');
      return;
    }
    const result = await batch.executeBatch(async (batchIds) => {
      const settled = await Promise.allSettled(
        batchIds.map((id) => forumOperatorApi.review(id, { action })),
      );
      return {
        data: {
          results: settled.map((r, i) => ({
            id: batchIds[i],
            status: (r.status === 'fulfilled' && (r.value as any)?.success !== false)
              ? ('success' as const)
              : ('failed' as const),
            error: r.status === 'rejected'
              ? String((r as PromiseRejectedResult).reason?.message ?? r.reason)
              : (r.status === 'fulfilled' && (r.value as any)?.success === false
                  ? ((r.value as any)?.error || '처리 실패')
                  : undefined),
          })),
        },
      };
    }, ids);
    if (result.successCount > 0) setSelectedRequestIds(new Set());
  };

  const handleBulkApprove = () => runRequestBulk('approve');
  const handleBulkReject = () => runRequestBulk('reject');

  const handleReview = async (action: 'approve' | 'reject' | 'revision') => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      const result = await forumOperatorApi.review(selectedRequest.id, {
        action,
        reviewComment: reviewComment || undefined,
      });
      if (result.success) {
        toast.success(action === 'approve' ? '승인되었습니다 — 포럼이 즉시 생성됩니다' : action === 'reject' ? '거부되었습니다' : '보완 요청되었습니다');
        setSelectedRequest(null);
        setReviewComment('');
        loadRequests();
      } else {
        toast.error(result.error || '처리 실패');
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateForum = async (request: RequestData, isRecreate = false) => {
    setCreatingRequestId(request.id);
    try {
      const result = isRecreate
        ? await forumOperatorApi.recreateForum(request.id)
        : await forumOperatorApi.createForum(request.id);
      if (result.success) {
        toast.success(`'${request.name}' 포럼이 생성되었습니다`);
        loadRequests();
        if (selectedRequest?.id === request.id) setSelectedRequest(null);
      } else {
        toast.error(result.error || '포럼 생성 실패');
        loadRequests();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '포럼 생성 중 오류가 발생했습니다');
      loadRequests();
    } finally {
      setCreatingRequestId(null);
    }
  };

  // ── Column definitions ──
  // WO-KPA-OPERATOR-FORUM-REQUESTS-TABLE-COMPLIANCE-V1: row 1줄 중심.
  const requestColumns: ListColumnDef<RequestData>[] = [
    {
      key: 'name',
      header: '포럼명',
      render: (_v, row) => (
        <div
          className="flex items-center gap-2 min-w-0"
          title={row.description || undefined}
        >
          <span className="font-medium text-slate-800 truncate">{row.name}</span>
          {row.forumType === 'closed' ? (
            <span className="shrink-0 px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600">비공개</span>
          ) : (
            <span className="shrink-0 px-1.5 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-600">공개</span>
          )}
          {row.tags && row.tags.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {row.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                  {tag}
                </span>
              ))}
              {row.tags.length > 2 && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500">
                  +{row.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'requesterName',
      header: '신청자',
      render: (_v, row) => (
        <span
          className="text-sm text-slate-800"
          title={row.requesterEmail || undefined}
        >
          {row.requesterName}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '신청일',
      width: '110px',
      render: (value) => <span className="text-sm text-slate-600">{formatDateOnly(value)}</span>,
    },
    {
      key: 'status',
      header: '상태',
      render: (value) => {
        const sc = statusConfig[value as CategoryRequestStatus] || statusConfig.pending;
        return (
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${sc.bgColor} ${sc.color}`}>
            {sc.label}
          </span>
        );
      },
    },
    {
      key: '_actions',
      header: '작업',
      align: 'center' as const,
      width: '120px',
      system: true,
      onCellClick: () => {},
      render: (_v, row) => (
        <RowActionMenu
          actions={buildRowActions(forumRequestPolicy, row, {
            recreateForum: () => handleCreateForum(row, true),
            review: () => { setSelectedRequest(row); setReviewComment(''); },
          }, {
            icons: REQUEST_ACTION_ICONS,
            loading: {
              recreateForum: creatingRequestId === row.id,
            },
          })}
        />
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* WO-O4O-KPA-OPERATOR-PARTIAL-CANONICAL-ALIGN-V1: BulkResultModal */}
      <BulkResultModal
        open={batch.showResult}
        onClose={() => {
          batch.clearResult();
          loadRequests();
        }}
        result={batch.result}
        onRetry={() => batch.retryFailed()}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-blue-600" />
            포럼 신청 관리
          </h1>
          <p className="text-slate-500 mt-1">
            포럼 생성 요청 심사
          </p>
        </div>
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
            title="대기 중 항목으로 필터링"
          >
            <Clock className="w-5 h-5" />
            <span className="font-medium">{pendingCount}건 심사 대기</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="포럼명 또는 신청자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CategoryRequestStatus | 'all')}
            className="pl-4 pr-8 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">모든 상태</option>
            <option value="pending">대기 중</option>
            <option value="revision_requested">보완 요청</option>
            <option value="completed">승인됨</option>
            <option value="failed">생성 실패</option>
            <option value="rejected">거부됨</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <input
          type="text"
          placeholder="태그 검색..."
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="pl-4 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm w-40"
        />
      </div>

      {/* WO-KPA-OPERATOR-FORUM-REQUESTS-TABLE-COMPLIANCE-V1: ActionBar (선택 ≥ 1) */}
      <ActionBar
        selectedCount={selectedRequestIds.size}
        onClearSelection={() => setSelectedRequestIds(new Set())}
        actions={[
          {
            key: 'approve',
            label: '승인',
            onClick: handleBulkApprove,
            variant: 'primary',
            icon: <CheckCircle size={14} />,
            loading: batch.loading,
            tooltip: '선택된 대기 항목을 일괄 승인합니다',
            confirm: {
              title: '선택 신청 일괄 승인',
              message: `${selectedRequestIds.size}건의 대기 항목을 승인합니다. (대기 외 상태는 제외됩니다)`,
              confirmText: '승인',
            },
          },
          {
            key: 'reject',
            label: '거부',
            onClick: handleBulkReject,
            variant: 'danger',
            icon: <XCircle size={14} />,
            loading: batch.loading,
            tooltip: '선택된 대기 항목을 일괄 거부합니다',
            confirm: {
              title: '선택 신청 일괄 거부',
              message: `${selectedRequestIds.size}건의 대기 항목을 거부합니다. (대기 외 상태는 제외됩니다)`,
              variant: 'danger' as const,
              confirmText: '거부',
            },
          },
        ]}
      />

      {/* DataTable */}
      <DataTable<RequestData>
        columns={requestColumns}
        data={filteredRequests}
        rowKey="id"
        loading={isLoading}
        emptyMessage="신청 내역이 없습니다"
        tableId="kpa-forum-requests"
        selectable
        selectedKeys={selectedRequestIds}
        onSelectionChange={setSelectedRequestIds}
        onRowClick={(row) => { setSelectedRequest(row); setReviewComment(''); }}
      />

      {/* 포럼 신청 상세 Drawer */}
      <BaseDetailDrawer
        open={!!selectedRequest}
        onClose={() => { setSelectedRequest(null); setReviewComment(''); }}
        title={selectedRequest?.name ?? ''}
        width={560}
        actions={selectedRequest ? [
          ...(isReviewable(selectedRequest.status) ? [
            { label: '거절', onClick: () => handleReview('reject'), variant: 'danger' as const, loading: isProcessing, disabled: isProcessing },
            { label: '보완 요청', onClick: () => handleReview('revision'), variant: 'default' as const, loading: isProcessing, disabled: isProcessing },
            { label: '승인', onClick: () => handleReview('approve'), variant: 'primary' as const, loading: isProcessing, disabled: isProcessing },
          ] : []),
          ...(canRecreateForum(selectedRequest.status) ? [
            { label: '재생성', onClick: () => handleCreateForum(selectedRequest, true), variant: 'default' as const, loading: creatingRequestId === selectedRequest.id, disabled: creatingRequestId === selectedRequest.id },
          ] : []),
        ] : []}
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">포럼 유형</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg ${selectedRequest.forumType === 'closed' ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'}`}>
                {selectedRequest.forumType === 'closed' ? '비공개 포럼' : '공개 포럼'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">포럼 설명</p>
              <p className="text-slate-800">{selectedRequest.description}</p>
            </div>
            {selectedRequest.tags && selectedRequest.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">태그</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRequest.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">{tag}</span>
                  ))}
                </div>
              </div>
            )}
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
                <label className="block text-sm font-medium text-slate-700 mb-2">검토 의견</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="승인/거절/보완 요청 사유를 입력하세요 (선택)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}

            {!isReviewable(selectedRequest.status) && selectedRequest.reviewComment && (
              <div className={`p-4 rounded-lg ${['approved', 'creating', 'completed'].includes(selectedRequest.status) ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm font-medium mb-1 ${['approved', 'creating', 'completed'].includes(selectedRequest.status) ? 'text-green-700' : 'text-red-700'}`}>
                  검토 의견
                </p>
                <p className={['approved', 'creating', 'completed'].includes(selectedRequest.status) ? 'text-green-600' : 'text-red-600'}>
                  {selectedRequest.reviewComment}
                </p>
                {selectedRequest.reviewedAt && (
                  <p className="text-xs text-slate-500 mt-2">
                    {selectedRequest.reviewerName} | {formatDate(selectedRequest.reviewedAt)}
                  </p>
                )}
              </div>
            )}

            {selectedRequest.status === 'failed' && selectedRequest.errorMessage && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-700 mb-1">생성 오류</p>
                <p className="text-sm text-red-600 font-mono break-all">{selectedRequest.errorMessage}</p>
              </div>
            )}

            {selectedRequest.status === 'completed' && selectedRequest.createdCategorySlug && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-700 mb-1">생성된 포럼</p>
                <p className="text-sm text-green-600">슬러그: <span className="font-mono">{selectedRequest.createdCategorySlug}</span></p>
              </div>
            )}
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}
