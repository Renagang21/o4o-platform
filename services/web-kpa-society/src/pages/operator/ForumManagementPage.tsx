/**
 * ForumManagementPage - KPA Society 포럼 카테고리 요청 관리
 * 분회/지부 운영자가 포럼 생성 요청을 검토/승인/거절
 *
 * organizationId 기반 범위 필터링:
 * - 분회 운영자: 자기 분회 소속 요청만
 * - 지부 운영자: 소속 지부 산하 모든 분회 요청
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
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

type CategoryRequestStatus = 'pending' | 'approved' | 'rejected';

interface RequestData {
  id: string;
  name: string;
  description: string;
  reason?: string;
  status: CategoryRequestStatus;
  serviceCode: string;
  organizationId?: string;
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

async function fetchApi(path: string, options?: RequestInit) {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...headers, ...options?.headers },
  });
  return res.json();
}

export default function ForumManagementPage() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CategoryRequestStatus | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 직접 카테고리 생성 모달
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ serviceCode: 'kpa-society' });
      if (statusFilter !== 'all') query.set('status', statusFilter);
      const data = await fetchApi(`/api/v1/forum/category-requests?${query}`);
      if (data.success) {
        setRequests(data.data || []);
      } else {
        setError(data.error || '목록 로딩 실패');
      }
    } catch {
      setError('신청 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const q = searchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.requesterName.toLowerCase().includes(q);
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      const data = await fetchApi(
        `/api/v1/forum/category-requests/${selectedRequest.id}/${action}`,
        { method: 'PATCH', body: JSON.stringify({ review_comment: reviewComment || undefined }) }
      );
      if (data.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === selectedRequest.id ? { ...r, ...data.data } : r))
        );
        setSelectedRequest(null);
        setReviewComment('');
      } else {
        alert(data.error || '처리 실패');
      }
    } catch {
      alert('처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!createName.trim() || !createDescription.trim()) return;
    setIsProcessing(true);
    try {
      const data = await fetchApi('/api/v1/forum/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: createName.trim(),
          description: createDescription.trim(),
          accessLevel: 'all',
        }),
      });
      if (data.success) {
        setShowCreateModal(false);
        setCreateName('');
        setCreateDescription('');
        alert('포럼 카테고리가 생성되었습니다.');
      } else {
        alert(data.error || '생성 실패');
      }
    } catch {
      alert('생성 중 오류가 발생했습니다.');
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="mt-4 text-red-600">{error}</p>
        <button
          onClick={loadRequests}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          다시 시도
        </button>
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
            포럼 관리
          </h1>
          <p className="text-slate-500 mt-1">
            포럼 생성 요청을 검토하고 승인하거나, 직접 카테고리를 만드세요
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg">
              <Clock className="w-5 h-5" />
              <span className="font-medium">{pendingCount}건 대기 중</span>
            </div>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            포럼 직접 생성
          </button>
        </div>
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
                    <div className="font-medium text-slate-800">{request.name}</div>
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
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => { setSelectedRequest(request); setReviewComment(''); }}
                            className="p-2 rounded-lg hover:bg-green-100 text-green-600"
                            title="승인"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedRequest(request); setReviewComment(''); }}
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

              {selectedRequest.status === 'pending' && (
                <div className="pt-4 border-t border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">검토 의견</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="승인 또는 거절 사유를 입력하세요 (선택)"
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              {selectedRequest.status !== 'pending' && selectedRequest.reviewComment && (
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
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleReview('reject')}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    거절
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
                    승인
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create Category Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">포럼 카테고리 직접 생성</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">카테고리 이름</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="예: 분회 자유게시판"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">설명</label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="카테고리에 대한 설명"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={isProcessing || !createName.trim() || !createDescription.trim()}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                생성
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
