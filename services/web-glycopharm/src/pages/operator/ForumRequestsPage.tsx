import { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { CategoryRequestStatus } from '@/types';
import { forumRequestApi } from '@/services/api';

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

const statusConfig: Record<CategoryRequestStatus, { label: string; color: string; bgColor: string }> = {
  pending: {
    label: '대기 중',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  approved: {
    label: '승인됨',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  rejected: {
    label: '거절됨',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
};

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

export default function ForumRequestsPage() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;

    setIsProcessing(true);

    try {
      const reviewData = { review_comment: reviewComment || undefined };
      const response = status === 'approved'
        ? await forumRequestApi.approve(selectedRequest.id, reviewData)
        : await forumRequestApi.reject(selectedRequest.id, reviewData);

      if (response.error) {
        alert(response.error.message);
      } else {
        // Update local state
        setRequests((prev) =>
          prev.map((r) =>
            r.id === selectedRequest.id
              ? {
                  ...r,
                  ...(response.data as RequestData),
                }
              : r
          )
        );
        setSelectedRequest(null);
        setReviewComment('');
      }
    } catch {
      alert('처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-primary-600" />
            포럼 신청 관리
          </h1>
          <p className="text-slate-500 mt-1">
            사용자의 포럼 생성 신청을 검토하고 승인하세요
          </p>
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
              const status = statusConfig[request.status];
              return (
                <tr key={request.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-slate-800">{request.name}</div>
                      <div className="text-sm text-slate-500 line-clamp-1">
                        {request.description}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-slate-800">{request.requesterName}</div>
                      {request.requesterEmail && (
                        <div className="text-sm text-slate-500">{request.requesterEmail}</div>
                      )}
                    </div>
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
                        onClick={() => setSelectedRequest(request)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                        title="상세보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setReviewComment('');
                            }}
                            className="p-2 rounded-lg hover:bg-green-100 text-green-600"
                            title="승인"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setReviewComment('');
                            }}
                            className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                            title="거절"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <FileCheck className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-slate-800">신청 내역이 없습니다</h3>
            <p className="mt-2 text-slate-500">
              검색 조건에 맞는 신청이 없습니다
            </p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedRequest(null)}
          />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                포럼 신청 상세
              </h2>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {/* Basic Info */}
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">포럼 이름</h4>
                  <p className="text-slate-800 font-medium">{selectedRequest.name}</p>
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

                {/* Review section for pending requests */}
                {selectedRequest.status === 'pending' && (
                  <div className="pt-4 border-t border-slate-200">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      검토 의견
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="승인 또는 거절 사유를 입력하세요 (선택)"
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                  </div>
                )}

                {/* Already reviewed */}
                {selectedRequest.status !== 'pending' && selectedRequest.reviewComment && (
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
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setSelectedRequest(null)}
                className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                닫기
              </button>
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleReview('rejected')}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    거절
                  </button>
                  <button
                    onClick={() => handleReview('approved')}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
