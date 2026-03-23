/**
 * ForumDeleteRequestsPage - 포럼 삭제 요청 관리
 *
 * WO-O4O-FORUM-DELETE-REQUEST-V1
 * GlycoPharm 운영자가 포럼 소유자의 삭제 요청을 승인/반려하는 화면
 */

import { useState, useEffect } from 'react';
import {
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Inbox,
  MessageSquare,
  X,
} from 'lucide-react';
import { forumDeleteRequestApi } from '@/services/api';

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
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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

  const openReview = (id: string, action: 'approve' | 'reject') => {
    setReviewingId(id);
    setReviewAction(action);
    setReviewComment('');
    setReviewError(null);
  };

  const handleReview = async () => {
    if (!reviewingId || !reviewAction) return;
    setReviewSaving(true);
    setReviewError(null);
    try {
      const fn = reviewAction === 'approve'
        ? forumDeleteRequestApi.approve
        : forumDeleteRequestApi.reject;
      const res = await fn(reviewingId, { reviewComment: reviewComment.trim() || undefined });
      if (res.error) {
        setReviewError(res.error.message);
      } else {
        setReviewingId(null);
        setReviewAction(null);
        loadRequests();
      }
    } catch {
      setReviewError('처리 중 오류가 발생했습니다.');
    } finally {
      setReviewSaving(false);
    }
  };

  const reviewTarget = requests.find(r => r.id === reviewingId);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-red-500" />
          포럼 삭제 요청 관리
        </h1>
        <p className="text-slate-500 mt-1">
          포럼 소유자의 삭제 요청을 검토하고 승인/반려합니다
        </p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1">
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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          <span className="ml-2 text-slate-500">불러오는 중...</span>
        </div>
      )}

      {/* Empty */}
      {!isLoading && requests.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="mt-3 text-lg font-medium text-slate-700">
            {statusFilter === 'pending' ? '대기 중인 삭제 요청이 없습니다' : '해당 상태의 요청이 없습니다'}
          </h3>
        </div>
      )}

      {/* Request List */}
      {!isLoading && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-xl border border-slate-200 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800">{req.name}</h3>
                    {req.description && (
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{req.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span>생성자: {req.creatorName || req.createdBy.slice(0, 8)}</span>
                      <span>게시글: {req.postCount}</span>
                      <span>요청일: {formatDate(req.deleteRequestedAt)}</span>
                    </div>
                    {req.deleteRequestReason && (
                      <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                        <span className="text-xs font-medium text-slate-500">삭제 사유: </span>
                        <span className="text-sm text-slate-700">{req.deleteRequestReason}</span>
                      </div>
                    )}
                    {req.deleteReviewComment && req.deleteRequestStatus !== 'pending' && (
                      <div className={`mt-2 p-2 rounded-lg ${
                        req.deleteRequestStatus === 'approved' ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <span className={`text-xs font-medium ${
                          req.deleteRequestStatus === 'approved' ? 'text-green-700' : 'text-red-700'
                        }`}>검토 의견: </span>
                        <span className={`text-sm ${
                          req.deleteRequestStatus === 'approved' ? 'text-green-600' : 'text-red-600'
                        }`}>{req.deleteReviewComment}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {req.deleteRequestStatus === 'pending' && (
                    <>
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-50 text-yellow-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        대기 중
                      </span>
                      <button
                        onClick={() => openReview(req.id, 'approve')}
                        className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => openReview(req.id, 'reject')}
                        className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        반려
                      </button>
                    </>
                  )}
                  {req.deleteRequestStatus === 'approved' && (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      승인됨
                    </span>
                  )}
                  {req.deleteRequestStatus === 'rejected' && (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      반려됨
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewingId && reviewAction && reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => !reviewSaving && setReviewingId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                {reviewAction === 'approve' ? '삭제 요청 승인' : '삭제 요청 반려'}
              </h3>
              <button
                onClick={() => !reviewSaving && setReviewingId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3 rounded-lg ${
              reviewAction === 'approve' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <p className={`text-sm font-medium ${
                reviewAction === 'approve' ? 'text-green-800' : 'text-red-800'
              }`}>
                "{reviewTarget.name}" 포럼의 삭제 요청을 {reviewAction === 'approve' ? '승인' : '반려'}합니다.
              </p>
              {reviewAction === 'approve' && (
                <p className="text-xs text-green-600 mt-1">승인 시 포럼이 비활성화 처리됩니다.</p>
              )}
            </div>

            {reviewError && (
              <div className="p-3 bg-red-50 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {reviewError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                검토 의견 <span className="text-slate-400 font-normal">(선택)</span>
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="검토 의견을 입력해주세요"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setReviewingId(null)}
                disabled={reviewSaving}
                className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleReview}
                disabled={reviewSaving}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${
                  reviewAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {reviewSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : reviewAction === 'approve' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {reviewSaving ? '처리 중...' : reviewAction === 'approve' ? '승인' : '반려'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
