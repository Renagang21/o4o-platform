/**
 * SupplyRequestsPage - 공급 요청 관리 (카드 기반)
 *
 * WO-O4O-SUPPLIER-SUPPLY-APPROVAL-UX-V1
 *
 * 핵심 기능:
 * - 카드 기반 공급 요청 목록
 * - 인라인 승인/거절 확인 모달
 * - 즉시 상태 반영 + 토스트 피드백
 *
 * 사용 API (기존):
 * - GET /supplier/requests
 * - POST /supplier/requests/:id/approve
 * - POST /supplier/requests/:id/reject
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  PauseCircle,
  Ban,
  Filter,
  Package,
  Search,
} from 'lucide-react';
import { supplierApi, type SupplierRequestStatus } from '../../lib/api';

interface SupplyRequest {
  id: string;
  status: SupplierRequestStatus;
  sellerName: string;
  sellerEmail: string;
  serviceName: string;
  serviceId: string;
  productName: string;
  productId: string;
  productPurpose: string;
  requestedAt: string;
}

const STATUS_CONFIG: Record<
  SupplierRequestStatus,
  { label: string; twBg: string; twText: string; icon: typeof Clock }
> = {
  pending: { label: '대기 중', twBg: 'bg-amber-50', twText: 'text-amber-700', icon: Clock },
  approved: { label: '승인됨', twBg: 'bg-green-50', twText: 'text-green-700', icon: CheckCircle },
  rejected: { label: '거절됨', twBg: 'bg-red-50', twText: 'text-red-700', icon: XCircle },
  suspended: { label: '일시 중단', twBg: 'bg-orange-50', twText: 'text-orange-700', icon: PauseCircle },
  revoked: { label: '공급 종료', twBg: 'bg-red-50', twText: 'text-red-700', icon: Ban },
  expired: { label: '계약 만료', twBg: 'bg-slate-50', twText: 'text-slate-500', icon: Clock },
};

const SERVICE_OPTIONS = [
  { id: 'all', name: '전체 서비스' },
  { id: 'glycopharm', name: 'GlycoPharm' },
  { id: 'k-cosmetics', name: 'K-Cosmetics' },
  { id: 'glucoseview', name: 'GlucoseView' },
];

export default function SupplyRequestsPage() {
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SupplierRequestStatus | 'all'>('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // modal state
  const [approveTarget, setApproveTarget] = useState<SupplyRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SupplyRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await supplierApi.getRequests();
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // counts
  const counts = {
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  // filter
  const filtered = requests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (serviceFilter !== 'all' && r.serviceId !== serviceFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !r.sellerName.toLowerCase().includes(q) &&
        !r.productName.toLowerCase().includes(q) &&
        !r.serviceName.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // approve
  const handleApprove = async () => {
    if (!approveTarget) return;
    setProcessing(true);
    try {
      const result = await supplierApi.approveRequest(approveTarget.id);
      if (result.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === approveTarget.id ? { ...r, status: 'approved' as const } : r)),
        );
        showToast(`${approveTarget.sellerName}의 공급 요청이 승인되었습니다.`);
      } else {
        showToast(result.error || '승인 처리 중 오류가 발생했습니다.');
      }
    } catch {
      showToast('승인 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
      setApproveTarget(null);
    }
  };

  // reject
  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessing(true);
    try {
      const result = await supplierApi.rejectRequest(rejectTarget.id, rejectReason || undefined);
      if (result.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === rejectTarget.id ? { ...r, status: 'rejected' as const } : r)),
        );
        showToast(`${rejectTarget.sellerName}의 공급 요청이 거절되었습니다.`);
      } else {
        showToast(result.error || '거절 처리 중 오류가 발생했습니다.');
      }
    } catch {
      showToast('거절 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
      setRejectTarget(null);
      setRejectReason('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">공급 요청 관리</h1>
          <p className="text-sm text-gray-500">
            서비스 운영자의 공급 요청을 확인하고 승인 또는 거절합니다.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-700">대기 중</span>
          </div>
          <p className="text-2xl font-bold text-amber-800">{counts.pending}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-sm font-medium text-green-700">승인됨</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{counts.approved}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-red-600" />
            <span className="text-sm font-medium text-red-700">거절됨</span>
          </div>
          <p className="text-2xl font-bold text-red-800">{counts.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="판매자명, 제품명, 서비스명 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SupplierRequestStatus | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">모든 상태</option>
            <option value="pending">대기 중</option>
            <option value="approved">승인됨</option>
            <option value="rejected">거절됨</option>
          </select>
        </div>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
        >
          {SERVICE_OPTIONS.map((svc) => (
            <option key={svc.id} value={svc.id}>
              {svc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        총 {filtered.length}건
        {statusFilter === 'all' && counts.pending > 0 && (
          <span className="ml-2 text-amber-600 font-medium">
            ({counts.pending}건 승인 대기)
          </span>
        )}
      </p>

      {/* Cards */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Package size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-lg">공급 요청이 없습니다</p>
          <p className="text-gray-400 text-sm mt-1">조건에 맞는 요청이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((req) => {
            const cfg = STATUS_CONFIG[req.status];
            const StatusIcon = cfg.icon;
            return (
              <div
                key={req.id}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  {/* Left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-900 text-base">{req.productName}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.twBg} ${cfg.twText}`}>
                        <StatusIcon size={12} />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>
                        <span className="text-gray-400">요청자:</span>{' '}
                        <span className="font-medium text-gray-700">{req.sellerName}</span>
                      </span>
                      <span>
                        <span className="text-gray-400">서비스:</span>{' '}
                        <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          {req.serviceName}
                        </span>
                      </span>
                      <span className="text-gray-400">
                        {new Date(req.requestedAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Right: actions */}
                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => setApproveTarget(req)}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => setRejectTarget(req)}
                        className="px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                      >
                        거절
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Modal */}
      {approveTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">공급 요청 승인</h2>
            <p className="text-sm text-gray-600 mb-6">다음 요청을 승인하시겠습니까?</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">제품명</span>
                <span className="font-medium text-gray-900">{approveTarget.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">요청자</span>
                <span className="font-medium text-gray-900">{approveTarget.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">서비스</span>
                <span className="font-medium text-gray-900">{approveTarget.serviceName}</span>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setApproveTarget(null)}
                disabled={processing}
                className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {processing ? '처리 중...' : '승인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">공급 요청 거절</h2>
            <p className="text-sm text-gray-600 mb-4">다음 요청을 거절하시겠습니까?</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">제품명</span>
                <span className="font-medium text-gray-900">{rejectTarget.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">요청자</span>
                <span className="font-medium text-gray-900">{rejectTarget.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">서비스</span>
                <span className="font-medium text-gray-900">{rejectTarget.serviceName}</span>
              </div>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력하세요 (선택)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-6 resize-none focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
                disabled={processing}
                className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? '처리 중...' : '거절'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
