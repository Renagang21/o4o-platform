import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  MessageSquarePlus,
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

const statusConfig: Record<CategoryRequestStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: {
    label: '검토 중',
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
  },
  approved: {
    label: '승인됨',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  rejected: {
    label: '거절됨',
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await forumRequestApi.getMyRequests();
      if (response.error) {
        setError(response.error.message);
      } else {
        setRequests((response.data || []) as RequestData[]);
      }
    } catch {
      setError('신청 내역을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
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
      <div className="max-w-2xl mx-auto py-8 px-4">
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
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <NavLink
          to="/forum"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          포럼으로 돌아가기
        </NavLink>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-7 h-7 text-primary-600" />
              내 신청 내역
            </h1>
            <p className="text-slate-500 mt-1">
              포럼 생성 신청 내역을 확인하세요
            </p>
          </div>
          <NavLink
            to="/forum/request-category"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            새 신청
          </NavLink>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.map((request) => {
          const status = statusConfig[request.status];
          const StatusIcon = status.icon;
          const isExpanded = expandedId === request.id;

          return (
            <div
              key={request.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : request.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg ${status.color.replace('text-', 'bg-').replace('700', '100')} flex items-center justify-center`}>
                    <StatusIcon className={`w-5 h-5 ${status.color.split(' ')[1]}`} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-800">{request.name}</h3>
                    <p className="text-sm text-slate-500">
                      {formatDate(request.createdAt)} 신청
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                  <ChevronRight
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-slate-100">
                  <div className="pt-4 space-y-4">
                    {/* Description */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-600 mb-1">포럼 설명</h4>
                      <p className="text-slate-800">{request.description}</p>
                    </div>

                    {/* Reason */}
                    {request.reason && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-600 mb-1">신청 사유</h4>
                        <p className="text-slate-800">{request.reason}</p>
                      </div>
                    )}

                    {/* Review Comment (for approved/rejected) */}
                    {request.reviewComment && (
                      <div className={`p-4 rounded-lg ${
                        request.status === 'approved'
                          ? 'bg-green-50'
                          : 'bg-red-50'
                      }`}>
                        <h4 className={`text-sm font-medium mb-1 ${
                          request.status === 'approved'
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`}>
                          관리자 의견
                        </h4>
                        <p className={
                          request.status === 'approved'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }>
                          {request.reviewComment}
                        </p>
                        {request.reviewedAt && (
                          <p className="text-xs text-slate-500 mt-2">
                            {formatDate(request.reviewedAt)} 검토
                          </p>
                        )}
                      </div>
                    )}

                    {/* Link to created forum (for approved) */}
                    {request.status === 'approved' && request.createdCategorySlug && (
                      <NavLink
                        to={`/forum?category=${request.createdCategorySlug}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        생성된 포럼 보기
                      </NavLink>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {requests.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-slate-800">신청 내역이 없습니다</h3>
          <p className="mt-2 text-slate-500">
            원하는 포럼을 신청해보세요
          </p>
          <NavLink
            to="/forum/request-category"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            새 포럼 신청
          </NavLink>
        </div>
      )}
    </div>
  );
}
