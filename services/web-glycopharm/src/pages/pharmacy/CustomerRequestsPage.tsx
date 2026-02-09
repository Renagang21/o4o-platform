/**
 * CustomerRequestsPage
 *
 * WO-O4O-COMMON-REQUEST-IMPLEMENTATION-PHASE1
 *
 * 고객 요청 목록 및 처리 페이지
 * - 대기 중인 요청 목록 표시
 * - 승인/거절 처리
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Check,
  X,
  Clock,
  QrCode,
  Tablet,
  Globe,
  Tv,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Package,
  ShoppingCart,
  ClipboardList,
  Info,
} from 'lucide-react';
import type { StoreApiResponse } from '@/types/store';
import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

/** 요청 목적 */
type CustomerRequestPurpose =
  | 'consultation'
  | 'sample'
  | 'order'
  | 'survey_followup'
  | 'info_followup';

/** 요청 출처 타입 */
type CustomerRequestSourceType = 'qr' | 'tablet' | 'web' | 'signage' | 'print';

/** 요청 상태 */
type CustomerRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/** 요청 아이템 */
interface CustomerRequest {
  id: string;
  purpose: CustomerRequestPurpose;
  sourceType: CustomerRequestSourceType;
  sourceId?: string;
  status: CustomerRequestStatus;
  customerContact?: string;
  customerName?: string;
  requestedAt: string;
  handledBy?: string;
  handledAt?: string;
  handleNote?: string;
  metadata?: Record<string, any>;
}

/** 페이지네이션 응답 */
interface PaginatedResponse {
  items: CustomerRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Purpose 설정 (아이콘 + 색상)
const PURPOSE_CONFIG: Record<CustomerRequestPurpose, { label: string; icon: typeof MessageCircle; color: string; bgColor: string }> = {
  consultation: { label: '상담 요청', icon: MessageCircle, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  sample:       { label: '샘플 신청', icon: Package, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  order:        { label: '주문 의도', icon: ShoppingCart, color: 'text-green-600', bgColor: 'bg-green-50' },
  survey_followup: { label: '설문 후속', icon: ClipboardList, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  info_followup:   { label: '정보 후속', icon: Info, color: 'text-slate-600', bgColor: 'bg-slate-50' },
};

// Source 아이콘 + 한글 라벨
const SOURCE_CONFIG: Record<CustomerRequestSourceType, { icon: typeof QrCode; label: string }> = {
  qr: { icon: QrCode, label: 'QR 코드' },
  tablet: { icon: Tablet, label: '태블릿' },
  web: { icon: Globe, label: '웹' },
  signage: { icon: Tv, label: '사이니지' },
  print: { icon: FileText, label: '인쇄물' },
};

// Status 레이블 및 색상
const STATUS_CONFIG: Record<CustomerRequestStatus, { label: string; bgColor: string; textColor: string }> = {
  pending: { label: '대기', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  approved: { label: '승인', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  rejected: { label: '거절', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  cancelled: { label: '취소', bgColor: 'bg-slate-100', textColor: 'text-slate-500' },
};

/** 거절 사유 (Phase 2-C) */
type RejectReason = 'out_of_stock' | 'unavailable_time' | 'unmet_conditions' | 'duplicate' | 'other';

const REJECT_REASON_CONFIG: Record<RejectReason, string> = {
  out_of_stock: '재고 없음',
  unavailable_time: '대응 불가 시간',
  unmet_conditions: '조건 미충족',
  duplicate: '중복 요청',
  other: '기타',
};

/** 액션 타입 한글 라벨 (Phase 2-C) */
const ACTION_TYPE_LABELS: Record<string, string> = {
  consultation_log: '상담 로그',
  sample_fulfillment: '샘플 이행',
  order_draft: '주문 초안',
  followup_log: '후속 기록',
};

const ACTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '초안', color: 'text-amber-600 bg-amber-50' },
  in_progress: { label: '진행 중', color: 'text-blue-600 bg-blue-50' },
  completed: { label: '완료', color: 'text-green-600 bg-green-50' },
};

export default function CustomerRequestsPage() {
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<CustomerRequestStatus | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Phase 2-C: Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<RejectReason | ''>('');
  const [rejectNote, setRejectNote] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = getAccessToken();
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '10');
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/glycopharm/requests?${params.toString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const result: StoreApiResponse<PaginatedResponse> = await response.json();

      if (result.success && result.data) {
        setRequests(result.data.items);
        setTotal(result.data.total);
        setTotalPages(result.data.totalPages);
      }
    } catch (err: any) {
      console.error('Failed to fetch requests:', err);
      setError(err.message || '요청 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (id: string) => {
    if (processingId) return;
    setProcessingId(id);

    try {
      const accessToken = getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/glycopharm/requests/${id}/approve`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
          credentials: 'include',
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      // Refresh list
      await fetchRequests();
    } catch (err: any) {
      console.error('Failed to approve request:', err);
      alert('요청 승인에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectNote('');
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTargetId || processingId) return;
    if (!rejectReason) {
      alert('거절 사유를 선택해주세요.');
      return;
    }
    setProcessingId(rejectTargetId);
    setRejectModalOpen(false);

    try {
      const accessToken = getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/glycopharm/requests/${rejectTargetId}/reject`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
          credentials: 'include',
          body: JSON.stringify({
            note: rejectNote || undefined,
            rejectReason,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to reject request');
      await fetchRequests();
    } catch (err: any) {
      console.error('Failed to reject request:', err);
      alert('요청 거절에 실패했습니다.');
    } finally {
      setProcessingId(null);
      setRejectTargetId(null);
    }
  };

  const formatRelativeTime = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  const formatAbsoluteDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">고객 요청</h1>
          <p className="text-slate-500 mt-1">QR/태블릿 등을 통한 고객 요청을 관리합니다.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRequests()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setStatusFilter('all'); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => { setStatusFilter('pending'); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            대기 중
          </button>
          <button
            onClick={() => { setStatusFilter('approved'); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            승인됨
          </button>
          <button
            onClick={() => { setStatusFilter('rejected'); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            거절됨
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">오류 발생</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && requests.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            {statusFilter === 'pending' ? '대기 중인 요청이 없습니다' : '요청이 없습니다'}
          </h3>
          <p className="text-slate-500">
            QR 코드나 태블릿을 통해 고객 요청이 들어오면 여기에 표시됩니다.
          </p>
        </div>
      )}

      {/* Request List */}
      {!loading && !error && requests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">목적</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">출처</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">고객 정보</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">요청 시각</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">상태</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((request) => {
                  const purposeConfig = PURPOSE_CONFIG[request.purpose];
                  const sourceConfig = SOURCE_CONFIG[request.sourceType];
                  const SourceIcon = sourceConfig.icon;
                  const PurposeIcon = purposeConfig.icon;
                  const statusConfig = STATUS_CONFIG[request.status];
                  const isProcessing = processingId === request.id;

                  return (
                    <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg ${purposeConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                            <PurposeIcon className={`w-4 h-4 ${purposeConfig.color}`} />
                          </div>
                          <span className={`text-sm font-medium ${purposeConfig.color}`}>
                            {purposeConfig.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <SourceIcon className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600">{sourceConfig.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {request.customerName && (
                            <p className="font-medium text-slate-800">{request.customerName}</p>
                          )}
                          {request.customerContact && (
                            <p className="text-slate-500">{request.customerContact}</p>
                          )}
                          {!request.customerName && !request.customerContact && (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-sm text-slate-600 cursor-default"
                          title={formatAbsoluteDate(request.requestedAt)}
                        >
                          {formatRelativeTime(request.requestedAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                          {request.status === 'pending' && <Clock className="w-3 h-3" />}
                          {statusConfig.label}
                        </span>
                        {/* Phase 2-C: 승인 결과 배지 */}
                        {request.status === 'approved' && request.metadata?.actionType && (
                          <div className="mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              ACTION_STATUS_LABELS[request.metadata.actionStatus]?.color || 'text-slate-500 bg-slate-50'
                            }`}>
                              {ACTION_TYPE_LABELS[request.metadata.actionType] || request.metadata.actionType}
                              {' '}({ACTION_STATUS_LABELS[request.metadata.actionStatus]?.label || request.metadata.actionStatus})
                            </span>
                          </div>
                        )}
                        {/* Phase 2-C: 거절 사유 배지 */}
                        {request.status === 'rejected' && request.metadata?.rejectReason && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-red-600 bg-red-50">
                              {REJECT_REASON_CONFIG[request.metadata.rejectReason as RejectReason] || request.metadata.rejectReason}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {request.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(request.id)}
                              disabled={isProcessing}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              승인
                            </button>
                            <button
                              onClick={() => openRejectModal(request.id)}
                              disabled={isProcessing}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                              거절
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 text-center block">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                총 {total}건 중 {(page - 1) * 10 + 1}-{Math.min(page * 10, total)}건
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phase 2-C: Reject Reason Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">거절 사유 선택</h3>

            <div className="space-y-2 mb-4">
              {(Object.entries(REJECT_REASON_CONFIG) as [RejectReason, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="rejectReason"
                    value={key}
                    checked={rejectReason === key}
                    onChange={() => setRejectReason(key)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 mb-1">메모 (선택)</label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="추가 메모를 입력하세요..."
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                거절
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
