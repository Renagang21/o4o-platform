/**
 * ForumDeleteRequestsPage - 포럼 삭제 요청 관리
 *
 * WO-O4O-FORUM-OPERATOR-UNIFICATION-V1
 * K-Cosmetics 운영자 포럼 삭제 요청 심사 페이지
 * 공통 /api/v1/forum/operator/* API 사용
 */

import { useState, useEffect } from 'react';
import { Trash2, Clock } from 'lucide-react';
import { BaseDetailDrawer } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { toast } from '@o4o/error-handling';
import { forumOperatorApi } from '@/services/forumApi';
import { GuideBlock } from '@o4o/shared-space-ui';
import { fetchGuidePageContent } from '@/api/guideContent';

const GUIDE_PAGE_KEY = 'forum.request.management';
const SERVICE_KEY = 'k-cosmetics';

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

  const [guideTitle, setGuideTitle] = useState<string | null>(null);
  const [guideDesc, setGuideDesc] = useState<string | null>(null);
  const [guideSteps, setGuideSteps] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGuidePageContent(SERVICE_KEY, GUIDE_PAGE_KEY)
      .then(sections => {
        if (cancelled) return;
        const raw = sections['guideblock-page-help'];
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
  }, []);

  useEffect(() => {
    loadRequests();
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

  const columns: ListColumnDef<DeleteRequestData>[] = [
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
      key: 'creatorName',
      header: '생성자',
      width: '120px',
      render: (_v, req) => <span className="text-slate-800">{req.creatorName || '-'}</span>,
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
        const s = statusConfig[req.deleteRequestStatus] || statusConfig.pending;
        return (
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${s.bgColor} ${s.color}`}>
            {s.label}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Trash2 className="w-7 h-7 text-pink-600" />
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

      {/* GuideBlock */}
      <GuideBlock
        variant="info"
        title={guideTitle ?? '포럼 삭제 요청을 검토합니다.'}
        description={guideDesc ?? '포럼 소유자의 삭제 요청을 승인하거나 반려합니다. 검토 의견을 함께 작성할 수 있습니다.'}
        steps={guideSteps ?? [
          '대기 중인 삭제 요청 목록을 확인합니다',
          '요청 상세 내용과 사유를 검토합니다',
          '승인 또는 반려를 선택하고 의견을 작성합니다',
          '처리 결과는 포럼 소유자에게 반영됩니다',
        ]}
        compact
      />

      {/* Status Filter */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-pink-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === 'all' ? '전체' : statusConfig[s].label}
          </button>
        ))}
      </div>

      <DataTable<DeleteRequestData>
        columns={columns}
        data={requests}
        rowKey="id"
        loading={isLoading}
        onRowClick={(req) => { setSelectedRequest(req); setReviewComment(''); }}
        emptyMessage="삭제 요청이 없습니다"
        tableId="kcos-forum-delete-requests"
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
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">포럼 설명</p>
              <p className="text-slate-800">{selectedRequest.description}</p>
            </div>

            {selectedRequest.deleteRequestReason && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">삭제 사유</p>
                <p className="text-slate-800">{selectedRequest.deleteRequestReason}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">생성자</p>
                <p className="text-slate-800">{selectedRequest.creatorName || '-'}</p>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">검토 의견</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="승인 또는 반려 사유를 입력하세요 (선택)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
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
