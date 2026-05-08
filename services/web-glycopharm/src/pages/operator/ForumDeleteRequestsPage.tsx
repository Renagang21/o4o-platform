/**
 * ForumDeleteRequestsPage - 포럼 삭제 요청 관리
 *
 * WO-O4O-FORUM-DELETE-REQUEST-V1
 * GlycoPharm 운영자가 포럼 소유자의 삭제 요청을 승인/반려하는 화면
 */

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { BaseDetailDrawer } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { forumDeleteRequestApi } from '@/services/api';
import { toast } from '@o4o/error-handling';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import { GuideBlock } from '@o4o/shared-space-ui';
import { fetchGuidePageContent } from '@/api/guideContent';

const GUIDE_PAGE_KEY = 'forum.request.management';
const SERVICE_KEY = 'glycopharm';

interface DeleteRequest {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  isActive: boolean;
  postCount: number;
  createdBy: string;
  creatorName?: string | null;
  deleteRequestStatus: 'pending' | 'approved' | 'rejected';
  deleteRequestedAt: string;
  deleteRequestReason?: string | null;
  deleteReviewedAt?: string | null;
  deleteReviewComment?: string | null;
}

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'pending', label: '대기 중' },
  { value: 'approved', label: '승인됨' },
  { value: 'rejected', label: '반려됨' },
  { value: 'all', label: '전체' },
];

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
  const [requests, setRequests] = useState<DeleteRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [selectedRequest, setSelectedRequest] = useState<DeleteRequest | null>(null);
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
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const res = await forumDeleteRequestApi.getAll({ status });
      setRequests((res.data || []) as DeleteRequest[]);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      const fn = action === 'approve'
        ? forumDeleteRequestApi.approve
        : forumDeleteRequestApi.reject;
      const res = await fn(selectedRequest.id, { reviewComment: reviewComment.trim() || undefined });
      if (res.error) {
        toast.error(res.error.message);
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

  const columns: ListColumnDef<DeleteRequest>[] = [
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
      render: (_v, req) => <StatusBadge status={req.deleteRequestStatus} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="포럼 삭제 요청 관리"
        description="포럼 소유자의 삭제 요청을 검토하고 승인/반려합니다"
        icon={<Trash2 className="w-6 h-6 text-red-500" />}
      />

      <GuideBlock
        variant="info"
        title={guideTitle ?? '포럼 삭제 요청을 검토합니다.'}
        description={guideDesc ?? '포럼 소유자가 제출한 삭제 요청을 승인하거나 반려합니다. 검토 의견을 함께 작성할 수 있습니다.'}
        steps={guideSteps ?? [
          '대기 중인 삭제 요청 목록을 확인합니다',
          '요청 상세 내용과 사유를 검토합니다',
          '승인 또는 반려를 선택하고 의견을 작성합니다',
          '처리 결과는 포럼 소유자에게 반영됩니다',
        ]}
        compact
      />

      {/* Status Tabs */}
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

      <DataTable<DeleteRequest>
        columns={columns}
        data={requests}
        rowKey="id"
        loading={isLoading}
        onRowClick={(req) => { setSelectedRequest(req); setReviewComment(''); }}
        emptyMessage="해당 상태의 삭제 요청이 없습니다"
        tableId="glycopharm-forum-delete-requests"
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
                  placeholder="검토 의견을 입력해주세요"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
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
