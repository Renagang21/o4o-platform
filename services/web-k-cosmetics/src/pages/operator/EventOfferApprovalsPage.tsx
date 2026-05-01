/**
 * EventOfferApprovalsPage — K-Cosmetics 이벤트 오퍼 승인
 *
 * WO-O4O-EVENT-OFFER-KCOS-OPERATOR-APPROVAL-V1
 *
 * Neture 공급자가 multi-service proposal로 K-Cos에 제안한 pending OPL을
 * K-Cos 운영자가 승인/반려한다.
 *
 * 라우팅: /operator/event-offers
 */

import { useEffect, useState, useCallback } from 'react';
import { Tag, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  cosmeticsEventOfferAdminApi,
  type PendingListing,
  type EventOfferApiError,
} from '../../api/eventOfferAdmin';

const STATUS_MESSAGE = {
  toastApproved: (title: string) => `"${title}" 이(가) 승인되었습니다.`,
  toastRejected: (title: string) => `"${title}" 이(가) 반려되었습니다.`,
  toastError: '처리 중 오류가 발생했습니다.',
  rejectReasonPrompt: '반려 사유를 입력해 주세요.',
  confirmApprove: (title: string) =>
    `"${title}" 이벤트를 승인하시겠습니까?\n승인 후 즉시 K-Cosmetics에 노출됩니다.`,
};

function formatDate(iso: string): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

function formatPrice(value: number | null): string {
  if (value == null) return '-';
  return '₩' + value.toLocaleString('ko-KR');
}

export default function EventOfferApprovalsPage() {
  const [items, setItems] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const setRowLoading = (id: string, value: boolean) =>
    setActionLoading(prev => ({ ...prev, [id]: value }));

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cosmeticsEventOfferAdminApi.listPendingEventOffers(1, 50);
      setItems(res.data.data ?? []);
    } catch (err: any) {
      const apiErr = err?.response?.data?.error as EventOfferApiError | undefined;
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError('운영자 권한이 필요합니다.');
      } else {
        setError(apiErr?.message ?? '목록을 불러오지 못했습니다.');
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleApprove = async (item: PendingListing) => {
    if (actionLoading[item.id]) return;
    if (!window.confirm(STATUS_MESSAGE.confirmApprove(item.productName))) return;
    setRowLoading(item.id, true);
    try {
      await cosmeticsEventOfferAdminApi.approveEventOffer(item.id);
      setItems(prev => prev.filter(p => p.id !== item.id));
      toast.success(STATUS_MESSAGE.toastApproved(item.productName));
    } catch (err: any) {
      const apiErr = err?.response?.data?.error as EventOfferApiError | undefined;
      toast.error(apiErr?.message || STATUS_MESSAGE.toastError);
    } finally {
      setRowLoading(item.id, false);
    }
  };

  const handleReject = async (item: PendingListing) => {
    if (actionLoading[item.id]) return;
    const reason = window.prompt(STATUS_MESSAGE.rejectReasonPrompt);
    if (reason === null) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error(STATUS_MESSAGE.rejectReasonPrompt);
      return;
    }
    setRowLoading(item.id, true);
    try {
      await cosmeticsEventOfferAdminApi.rejectEventOffer(item.id, trimmed);
      setItems(prev => prev.filter(p => p.id !== item.id));
      toast.success(STATUS_MESSAGE.toastRejected(item.productName));
    } catch (err: any) {
      const apiErr = err?.response?.data?.error as EventOfferApiError | undefined;
      toast.error(apiErr?.message || STATUS_MESSAGE.toastError);
    } finally {
      setRowLoading(item.id, false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag size={24} className="text-pink-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">이벤트 오퍼 승인</h1>
            <p className="text-slate-500 mt-1">
              공급자가 제안한 K-Cosmetics 이벤트를 검토하고 승인/반려합니다.
            </p>
          </div>
        </div>
        <button
          onClick={loadPending}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50"
        >
          새로고침
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 size={28} className="animate-spin text-pink-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Tag size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-sm">승인 대기중인 이벤트가 없습니다.</p>
          </div>
        ) : (
          <div>
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_180px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>상품명</span>
              <span>공급사 / 제안자</span>
              <span>가격</span>
              <span>제안일</span>
              <span className="text-right">작업</span>
            </div>

            {items.map(item => {
              const isActing = !!actionLoading[item.id];
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_1.5fr_1fr_1fr_180px] gap-4 px-5 py-4 border-b border-slate-100 last:border-0 items-center hover:bg-slate-50/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {item.productName}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 truncate">{item.supplierName}</p>
                    {item.requestedByEmail && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {item.requestedByEmail}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    {formatPrice(item.price)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDate(item.createdAt)}
                  </span>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={isActing}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-pink-600 hover:bg-pink-700 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isActing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}
                      승인
                    </button>
                    <button
                      onClick={() => handleReject(item)}
                      disabled={isActing}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <XCircle size={12} />
                      반려
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
