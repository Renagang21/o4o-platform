/**
 * ForumManagementPage - 포럼 카테고리 요청 관리
 *
 * WO-O4O-KPA-A-FORUM-ALIGNMENT-V1
 * 공통 /api/v1/forum/operator/* API 사용 (forumOperatorApi)
 * KPA Extension API 제거 → Forum Core 통합
 */

import { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { forumOperatorApi } from '../../api/forum';

type CategoryRequestStatus = 'pending' | 'revision_requested' | 'approved' | 'rejected';

interface RequestData {
  id: string;
  name: string;
  description: string;
  reason?: string;
  forumType?: string;
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

export default function ForumManagementPage() {
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
        toast.success(action === 'approve' ? '승인되었습니다' : action === 'reject' ? '거절되었습니다' : '보완 요청되었습니다');
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
            <FileCheck className="w-7 h-7 text-blue-600" />
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
            <option value="approved">승인됨</option>
            <option value="rejected">거절됨</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">포럼명</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">신청자</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">신청일</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">상태</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-slate-600">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRequests.map((request) => {
              const status = statusConfig[request.status] || statusConfig.pending;
              return (
                <tr key={request.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{request.name}</span>
                      {request.forumType === 'closed' ? (
                        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600">비공개</span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-600">공개</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 line-clamp-1">{request.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-800">{request.requesterName}</div>
                    {request.requesterEmail && (
                      <div className="text-sm text-slate-500">{request.requesterEmail}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(request.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setSelectedRequest(request); setReviewComment(''); }}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                        title="상세보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <FileCheck className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-slate-800">신청 내역이 없습니다</h3>
            <p className="mt-2 text-slate-500">포럼 생성 요청이 들어오면 여기에 표시됩니다</p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedRequest(null)} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">포럼 신청 상세</h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-1">포럼 이름</h4>
                <p className="text-slate-800 font-medium">{selectedRequest.name}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-1">포럼 유형</h4>
                <p className="text-slate-800">
                  {selectedRequest.forumType === 'closed' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg bg-slate-100 text-slate-700">비공개 포럼</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg bg-blue-50 text-blue-700">공개 포럼</span>
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-1">포럼 설명</h4>
                <p className="text-slate-800">{selectedRequest.description}</p>
              </div>
              {selectedRequest.reason && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">신청 사유</h4>
                  <p className="text-slate-800">{selectedRequest.reason}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">신청자</h4>
                  <p className="text-slate-800">{selectedRequest.requesterName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">신청일</h4>
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
                <div className={`p-4 rounded-lg ${selectedRequest.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <h4 className={`text-sm font-medium mb-1 ${selectedRequest.status === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
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

            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setSelectedRequest(null)}
                className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                닫기
              </button>
              {isReviewable(selectedRequest.status) && (
                <>
                  <button
                    onClick={() => handleReview('reject')}
                    disabled={isProcessing}
                    className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    거절
                  </button>
                  <button
                    onClick={() => handleReview('revision')}
                    disabled={isProcessing}
                    className="px-4 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    보완
                  </button>
                  <button
                    onClick={() => handleReview('approve')}
                    disabled={isProcessing}
                    className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    승인
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
