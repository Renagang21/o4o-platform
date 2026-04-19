/**
 * ForumDeleteRequestsPage - 포럼 삭제 요청 관리
 *
 * WO-O4O-KPA-A-FORUM-ALIGNMENT-V1
 * WO-O4O-TABLE-STANDARD-V2 — DataTable 표준 전환
 * WO-O4O-TABLE-STANDARD-V3 — Batch API + ActionBar v2 + BulkResultModal
 *
 * 공통 /api/v1/forum/operator/* API 사용 (forumOperatorApi)
 */

import { useState, useEffect } from 'react';
import {
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
} from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar, BulkResultModal } from '@o4o/ui';
import { DataTable, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { forumOperatorApi } from '../../api/forum';

type DeleteRequestStatus = 'pending' | 'approved' | 'rejected';

interface DeleteRequestData {
  id: string;
  name: string;
  description: string;
  slug: string;
  isActive: boolean;
  postCount: number;
  createdBy: string;
  creatorName: string | null;
  deleteRequestStatus: DeleteRequestStatus;
  deleteRequestedAt: string;
  deleteRequestReason: string | null;
  deleteReviewedAt: string | null;
  deleteReviewComment: string | null;
}

const statusConfig: Record<DeleteRequestStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '대기 중', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  approved: { label: '승인됨', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: '반려됨', color: 'text-red-700', bgColor: 'bg-red-100' },
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

export default function ForumDeleteRequestsPage() {
  const [requests, setRequests] = useState<DeleteRequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DeleteRequestStatus | 'all'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<DeleteRequestData | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Selection & V3 batch
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  // Reset selection on filter change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const result = await forumOperatorApi.getDeleteRequests({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setRequests(result.data || []);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingCount = requests.filter((r) => r.deleteRequestStatus === 'pending').length;

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      const fn = action === 'approve' ? forumOperatorApi.approveDelete : forumOperatorApi.rejectDelete;
      const result = await fn(selectedRequest.id, { reviewComment: reviewComment || undefined });
      if (result.success) {
        toast.success(action === 'approve' ? '삭제 승인되었습니다' : '반려되었습니다');
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

  // ─── V3: Batch Actions ───

  const handleBulkApprove = async () => {
    const pendingIds = [...selectedIds].filter((id) => {
      const r = requests.find((req) => req.id === id);
      return r?.deleteRequestStatus === 'pending';
    });
    if (pendingIds.length === 0) return;
    const result = await batch.executeBatch(
      (batchIds) => forumOperatorApi.batchApproveDelete(batchIds),
      pendingIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      loadRequests();
    }
  };

  const handleBulkReject = async () => {
    const pendingIds = [...selectedIds].filter((id) => {
      const r = requests.find((req) => req.id === id);
      return r?.deleteRequestStatus === 'pending';
    });
    if (pendingIds.length === 0) return;
    const result = await batch.executeBatch(
      (batchIds) => forumOperatorApi.batchRejectDelete(batchIds, '일괄 반려'),
      pendingIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      loadRequests();
    }
  };

  const selectedPendingCount = [...selectedIds].filter((id) => {
    const r = requests.find((req) => req.id === id);
    return r?.deleteRequestStatus === 'pending';
  }).length;

  // ─── Column Definitions ───

  const columns: ListColumnDef<DeleteRequestData>[] = [
    {
      key: 'name',
      header: '포럼명',
      sortable: true,
      render: (_v, row) => (
        <div>
          <div className="font-medium text-slate-800">{row.name}</div>
          <div className="text-sm text-slate-500 line-clamp-1">{row.description}</div>
        </div>
      ),
    },
    {
      key: 'creatorName',
      header: '생성자',
      render: (_v, row) => row.creatorName || '-',
    },
    {
      key: 'postCount',
      header: '게시글 수',
      sortable: true,
      sortAccessor: (row) => row.postCount,
    },
    {
      key: 'deleteRequestedAt',
      header: '요청일',
      sortable: true,
      sortAccessor: (row) => new Date(row.deleteRequestedAt).getTime(),
      render: (_v, row) => (
        <span className="text-sm text-slate-600">{formatDate(row.deleteRequestedAt)}</span>
      ),
    },
    {
      key: 'deleteRequestStatus',
      header: '상태',
      render: (_v, row) => {
        const status = statusConfig[row.deleteRequestStatus] || statusConfig.pending;
        return (
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}>
            {status.label}
          </span>
        );
      },
    },
    {
      key: '_actions',
      header: '작업',
      system: true,
      align: 'right',
      width: '80px',
      onCellClick: () => {},
      render: (_v, row) => (
        <button
          onClick={() => { setSelectedRequest(row); setReviewComment(''); }}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          title="상세보기"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-2 text-slate-600">로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Trash2 className="w-7 h-7 text-blue-600" />
            포럼 삭제 요청 관리
          </h1>
          <p className="text-slate-500 mt-1">
            포럼 소유자의 삭제 요청을 검토하고 승인하거나 반려하세요
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="font-medium">{pendingCount}건 대기 중</span>
          </div>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === 'all' ? '전체' : statusConfig[s].label}
          </button>
        ))}
      </div>

      {/* V3: ActionBar with batch */}
      <ActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          {
            key: 'approve',
            label: `삭제 승인 (${selectedPendingCount})`,
            onClick: handleBulkApprove,
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
            onClick: handleBulkReject,
            variant: 'danger' as const,
            icon: <XCircle size={14} />,
            loading: batch.loading,
            group: 'actions',
            tooltip: '선택된 삭제 요청을 일괄 반려합니다',
            visible: selectedPendingCount > 0,
          },
        ]}
      />

      {/* DataTable */}
      <DataTable<DeleteRequestData>
        columns={columns}
        data={requests}
        rowKey="id"
        loading={false}
        emptyMessage={
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-slate-800">삭제 요청이 없습니다</h3>
            <p className="mt-2 text-slate-500">포럼 삭제 요청이 들어오면 여기에 표시됩니다</p>
          </div>
        }
        tableId="kpa-forum-delete-requests"
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* V3: BulkResultModal */}
      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); loadRequests(); }}
        result={batch.result}
        onRetry={() => { batch.retryFailed(); }}
      />

      {/* Review Modal */}
      {selectedRequest && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedRequest(null)} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">삭제 요청 상세</h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-1">포럼 이름</h4>
                <p className="text-slate-800 font-medium">{selectedRequest.name}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-1">포럼 설명</h4>
                <p className="text-slate-800">{selectedRequest.description}</p>
              </div>
              {selectedRequest.deleteRequestReason && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">삭제 사유</h4>
                  <p className="text-slate-800">{selectedRequest.deleteRequestReason}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">생성자</h4>
                  <p className="text-slate-800">{selectedRequest.creatorName || '-'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">게시글 수</h4>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">검토 의견</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="승인 또는 반려 사유를 입력하세요 (선택)"
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              {selectedRequest.deleteRequestStatus !== 'pending' && selectedRequest.deleteReviewComment && (
                <div className={`p-4 rounded-lg ${selectedRequest.deleteRequestStatus === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <h4 className={`text-sm font-medium mb-1 ${selectedRequest.deleteRequestStatus === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
                    검토 의견
                  </h4>
                  <p className={selectedRequest.deleteRequestStatus === 'approved' ? 'text-green-600' : 'text-red-600'}>
                    {selectedRequest.deleteReviewComment}
                  </p>
                  {selectedRequest.deleteReviewedAt && (
                    <p className="text-xs text-slate-500 mt-2">
                      {formatDate(selectedRequest.deleteReviewedAt)}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setSelectedRequest(null)}
                className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                닫기
              </button>
              {selectedRequest.deleteRequestStatus === 'pending' && (
                <>
                  <button
                    onClick={() => handleReview('reject')}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    반려
                  </button>
                  <button
                    onClick={() => handleReview('approve')}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    삭제 승인
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
