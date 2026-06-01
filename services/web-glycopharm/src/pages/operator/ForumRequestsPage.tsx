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
import type { CategoryRequestStatus } from '@/types';
import { forumRequestApi } from '@/services/api';
import { toast } from '@o4o/error-handling';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';

interface RequestData {
  id: string;
  name: string;
  description: string;
  reason?: string;
  status: CategoryRequestStatus;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdCategoryId?: string;
  createdCategorySlug?: string;
  createdAt: string;
  updatedAt: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isReviewable(status: CategoryRequestStatus): boolean {
  return status === 'pending' || status === 'revision_requested';
}

export default function ForumRequestsPage() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CategoryRequestStatus | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // WO-O4O-GLYCOPHARM-KCOS-FORUM-REQUEST-BULK-PARITY-V1:
  //   ForumDeleteRequestsPage 와 동일 조작 질서 — checkbox selection + ActionBar + bulk 승인/반려.
  //   revision(보완)은 의견 필수이므로 bulk 대상에서 제외. backend batch 부재 → review fan-out.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  // 필터 변경 시 선택 초기화
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter]);

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await forumRequestApi.getAllRequests({
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      if (response.error) {
        setError(response.error.message);
      } else {
        setRequests((response.data || []) as RequestData[]);
      }
    } catch {
      setError('신청 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requesterName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending' || r.status === 'revision_requested').length;

  const handleReview = async (action: 'approve' | 'reject' | 'revision') => {
    if (!selectedRequest) return;

    if (action === 'revision' && !reviewComment.trim()) {
      toast.error('보완 요청 시 의견을 입력해주세요.');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await forumRequestApi.review(selectedRequest.id, {
        action,
        reviewComment: reviewComment || undefined,
      });

      if (response.error) {
        toast.error(response.error.message);
      } else {
        await loadRequests();
        setSelectedRequest(null);
        setReviewComment('');
        toast.success(
          action === 'approve' ? '승인 완료' :
          action === 'reject' ? '거절 완료' :
          '보완 요청 완료'
        );
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Bulk Actions (review fan-out, 보완 제외) ───

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
      const settled = await Promise.allSettled(
        ids.map((id) => forumRequestApi.review(id, { action })),
      );
      return {
        data: {
          results: settled.map((r, i) => {
            if (r.status === 'rejected') {
              return { id: ids[i], status: 'failed' as const, error: (r.reason as any)?.message || '오류' };
            }
            const apiErr = (r.value as any)?.error;
            if (apiErr) {
              return { id: ids[i], status: 'failed' as const, error: apiErr.message || '처리 실패' };
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

  const columns: ListColumnDef<RequestData>[] = [
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
      width: '100px',
      render: (_v, req) => <StatusBadge status={req.status} />,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
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
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="포럼 신청 관리"
        description="사용자의 포럼 생성 신청을 검토하고 승인하세요"
        icon={<FileCheck className="w-7 h-7 text-primary-600" />}
        actions={
          pendingCount > 0 ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg">
              <Clock className="w-5 h-5" />
              <span className="font-medium">{pendingCount}건의 대기 중인 신청</span>
            </div>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="포럼명 또는 신청자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CategoryRequestStatus | 'all')}
            className="pl-4 pr-8 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white"
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

      {/* Bulk ActionBar + 결과 모달 */}
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
      <DataTable<RequestData>
        columns={columns}
        data={filteredRequests}
        rowKey="id"
        loading={isLoading}
        onRowClick={(req) => { setSelectedRequest(req); setReviewComment(''); }}
        emptyMessage="검색 조건에 맞는 신청이 없습니다"
        tableId="glycopharm-forum-requests"
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Detail Drawer */}
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
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
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
