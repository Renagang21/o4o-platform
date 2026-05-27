/**
 * EventOfferManagePage — 이벤트 오퍼 승인 관리 (GlycoPharm 운영자)
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1
 *
 * 공급자가 제안한 Event Offer를 운영자가 검토하고 승인/반려한다.
 * Backend: /api/v1/glycopharm/operator/event-offers (serviceKey='glycopharm-event-offer')
 */

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  glycopharmEventOfferAdminApi,
  type PendingListing,
} from '../../../api/eventOfferAdmin';

function formatPrice(price: number | null): string {
  if (price == null) return '미정';
  return `${price.toLocaleString('ko-KR')}원`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR');
}

export default function EventOfferManagePage() {
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await glycopharmEventOfferAdminApi.getPendingListings(1, 50);
      if (res.data.success) {
        setPendingListings(res.data.data);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || '데이터를 불러오지 못했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (item: PendingListing) => {
    if (!window.confirm(`"${item.productName}" 이벤트를 승인하시겠습니까?\n승인 후 즉시 매장에 노출됩니다.`)) return;
    setActionId(item.id);
    try {
      await glycopharmEventOfferAdminApi.approveListing(item.id);
      setPendingListings(prev => prev.filter(p => p.id !== item.id));
      toast.success(`"${item.productName}" 이(가) 승인되었습니다.`);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || '승인 처리 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (item: PendingListing) => {
    const reason = window.prompt('반려 사유를 입력해 주세요.');
    if (reason === null) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error('반려 사유를 입력해 주세요.');
      return;
    }
    setActionId(item.id);
    try {
      await glycopharmEventOfferAdminApi.rejectListing(item.id, trimmed);
      setPendingListings(prev => prev.filter(p => p.id !== item.id));
      toast.success(`"${item.productName}" 이(가) 반려되었습니다.`);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || '반려 처리 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">이벤트 오퍼 승인</h1>
          <p className="text-sm text-slate-500 mt-1">
            공급사가 제안한 이벤트를 검토하고 승인하면 GlycoPharm 약국에 노출됩니다.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          새로고침
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-6">
          {error}
        </div>
      )}

      {/* 승인 대기 섹션 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-amber-50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-base font-semibold text-slate-800">
              승인 대기
              {pendingListings.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                  {pendingListings.length}
                </span>
              )}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            공급사가 제안한 이벤트입니다. 검토 후 승인하면 매장에 노출됩니다.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : pendingListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <CheckCircle className="w-10 h-10 mb-3 text-emerald-400" />
            <p className="text-sm font-medium text-slate-600">승인 대기중인 이벤트가 없습니다</p>
            <p className="text-xs mt-1">모든 제안이 처리되었습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingListings.map((item) => {
              const isProcessing = actionId === item.id;
              return (
                <div key={item.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.productName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">공급사: {item.supplierName}</p>

                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                        <span>
                          단가: <span className="font-medium text-slate-700">{formatPrice(item.price)}</span>
                        </span>
                        {item.eventPrice != null && (
                          <span>
                            이벤트가: <span className="font-medium text-emerald-700">{formatPrice(item.eventPrice)}</span>
                          </span>
                        )}
                        {item.totalQuantity != null && (
                          <span>
                            수량: <span className="font-medium text-slate-700">{item.totalQuantity.toLocaleString()}개</span>
                          </span>
                        )}
                        {(item.startAt || item.endAt) && (
                          <span>
                            기간: {formatDate(item.startAt)} ~ {formatDate(item.endAt)}
                          </span>
                        )}
                      </div>

                      {item.requestedByEmail && (
                        <p className="text-xs text-slate-400 mt-1">신청자: {item.requestedByEmail}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        신청일: {formatDate(item.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleReject(item)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        {isProcessing
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <XCircle className="w-3 h-3" />
                        }
                        반려
                      </button>
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {isProcessing
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <CheckCircle className="w-3 h-3" />
                        }
                        승인
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4">
        주문·결제·배송은 공급자 시스템에서 처리되며, 본 화면에서는 이벤트 노출 승인만 관리합니다.
      </p>
    </div>
  );
}
