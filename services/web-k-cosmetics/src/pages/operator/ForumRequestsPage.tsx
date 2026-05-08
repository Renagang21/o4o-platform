/**
 * ForumRequestsPage - 포럼 카테고리 요청 관리
 *
 * WO-O4O-FORUM-OPERATOR-UNIFICATION-V1
 * K-Cosmetics 운영자 포럼 신청 검토 페이지
 * 공통 /api/v1/forum/operator/* API 사용
 */

import { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  Clock,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { BaseDetailDrawer } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { toast } from '@o4o/error-handling';
import { forumOperatorApi } from '@/services/forumApi';

type CategoryRequestStatus = 'pending' | 'revision_requested' | 'approved' | 'rejected';

interface RequestData {
  id: string;
  name: string;
  description: string;
  reason?: string;
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
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<CategoryRequestStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '대기 중', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  revision_requested: { label: '보완 요청', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  approved: { label: '승인됨', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: '거절됨', color: 'text-red-700', bgColor: 'bg-red-100' },
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

function isReviewable(status: string): boolean {
  return status === 'pending' || status === 'revision_requested';
}

export default function ForumRequestsPage() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CategoryRequestStatus | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
    return r.name.toLowerCase().includes(q) || r.requesterName.toLowerCase().includes(q);
  });

  const pendingCount = requests.filter((r) => isReviewable(r.status)).length;

  const handleReview = async (action: 'approve' | 'reject' | 'revision') => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      const result = await forumOperatorApi.review(selectedRequest.id, {
        action,
        reviewComment: reviewComment || undefined,
      });
      if (result.success) {
        toast.success(
          action === 'approve' ? '승인되었습니다' :
          action === 'reject' ? '거절되었습니다' :
          '보완 요청되었습니다'
        );
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
      width: '120px',
      render: (_v, req) => {
        const s = statusConfig[req.status] || statusConfig.pending;
        return (
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${s.bgColor} ${s.color}`}>
            {s.label}
          </span>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
        <span className="ml-2 text-slate-600">로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-pink-600" />
            포럼 신청 관리
          </h1>
          <p className="text-slate-500 mt-1">
            포럼 생성 요청을 검토하고 승인/거절/보완요청하세요
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="font-medium">{pendingCount}건 심사 대기</span>
          </div>
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
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CategoryRequestStatus | 'all')}
            className="pl-4 pr-8 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 appearance-none bg-white"
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

      <DataTable<RequestData>
        columns={columns}
        data={filteredRequests}
        rowKey="id"
        loading={isLoading}
        onRowClick={(req) => { setSelectedRequest(req); setReviewComment(''); }}
        emptyMessage="검색 조건에 맞는 신청이 없습니다"
        tableId="kcos-forum-requests"
      />

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
                <label className="block text-sm font-medium text-slate-700 mb-2">검토 의견</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="승인/거절/보완 요청 사유를 입력하세요 (선택)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
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
                <p className={selectedRequest.status === 'approved' ? 'text-green-600' : 'text-red-600'}>
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
