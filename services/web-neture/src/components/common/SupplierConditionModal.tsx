/**
 * SupplierConditionModal — 공급자 B2B 주문 조건 표시 모달
 *
 * WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
 *
 * 매장 주문자가 제품 리스트나 장바구니에서 공급자명을 클릭했을 때
 * 해당 공급자의 최소 주문 금액 / 미달 시 물류비 / 안내 문구를 표시한다.
 *
 * 조건이 없으면 "조건 없음"으로 표시한다.
 */

import { useCallback, useEffect, useState } from 'react';
import { X, ShoppingCart, AlertCircle, Loader2 } from 'lucide-react';
import { supplierProfileApi, type SupplierOrderCondition } from '../../lib/api';
import { SUPPLIER_ORDER_CONDITION_NOT_FOUND } from '../../lib/api/supplier';

/**
 * WO-O4O-NETURE-SUPPLIER-ORDER-CONDITION-LOAD-ERROR-CONTRACT-V1
 *   not-found  404 — 공급자 부재 또는 비활성. 재시도해도 결과가 같다.
 *   error      401·500·네트워크·깨진 payload. 재시도 대상이다.
 * "조건 없음" 은 success 상태에서 필드가 비었을 때만 표시한다 — 오류로 위장하지 않는다.
 */
type ConditionLoadState = 'idle' | 'loading' | 'error' | 'not-found' | 'success';

interface Props {
  supplierId: string | null;
  fallbackName?: string;
  open: boolean;
  onClose: () => void;
}

function formatKRW(value: number | null | undefined): string {
  if (value == null) return '-';
  return value.toLocaleString('ko-KR') + '원';
}

export default function SupplierConditionModal({ supplierId, fallbackName, open, onClose }: Props) {
  const [data, setData] = useState<SupplierOrderCondition | null>(null);
  const [loadState, setLoadState] = useState<ConditionLoadState>('idle');

  // .then() 전용 흐름은 API 가 throw 하는 순간 unhandled rejection 이 된다 — try/catch 로 감싼다.
  const loadCondition = useCallback(async () => {
    if (!supplierId) return;
    setLoadState('loading');
    setData(null);
    try {
      const result = await supplierProfileApi.getOrderCondition(supplierId);
      setData(result);
      setLoadState('success');
    } catch (e) {
      setLoadState(
        (e as Error)?.message === SUPPLIER_ORDER_CONDITION_NOT_FOUND ? 'not-found' : 'error',
      );
    }
  }, [supplierId]);

  useEffect(() => {
    if (!open || !supplierId) return;
    loadCondition();
  }, [open, supplierId, loadCondition]);

  const loading = loadState === 'loading';

  if (!open) return null;

  const hasMinOrder = data?.minOrderAmount != null && data.minOrderAmount > 0;
  const hasSurcharge = data?.minOrderSurcharge != null && data.minOrderSurcharge > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <ShoppingCart className="w-5 h-5 text-slate-500" />
            공급자 주문 조건
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Supplier name */}
          <p className="text-sm text-slate-500 mb-4">
            공급사: <span className="font-medium text-slate-800">{data?.supplierName || fallbackName || '공급자'}</span>
          </p>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              조건을 불러오는 중...
            </div>
          )}

          {loadState === 'error' && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>주문 조건을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</span>
              </div>
              <button
                onClick={loadCondition}
                className="mt-3 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm hover:bg-slate-50 transition-colors"
              >
                다시 시도
              </button>
            </div>
          )}

          {loadState === 'not-found' && (
            <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>공급자 정보를 확인할 수 없습니다.</span>
            </div>
          )}

          {loadState === 'success' && data && (
            <div className="space-y-4">
              {/* 최소 주문 금액 */}
              <Row
                label="최소 주문 금액"
                value={hasMinOrder ? formatKRW(data.minOrderAmount) : '조건 없음'}
                muted={!hasMinOrder}
              />

              {/* 미달 시 물류비 */}
              <Row
                label="최소 주문 미달 시 물류비"
                value={hasSurcharge ? `+${formatKRW(data.minOrderSurcharge)}` : '조건 없음'}
                muted={!hasSurcharge}
              />

              {/* 안내 문구 */}
              {data.note && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 mb-1.5">안내</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{data.note}</p>
                </div>
              )}

              {!hasMinOrder && !hasSurcharge && !data.note && (
                <p className="text-sm text-slate-500 text-center py-3">
                  이 공급자는 별도 주문 조건을 설정하지 않았습니다.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            ※ 안내 정보입니다. 실제 결제 금액 반영은 별도 단계에서 처리됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-base font-semibold ${muted ? 'text-slate-400' : 'text-slate-900'}`}>
        {value}
      </span>
    </div>
  );
}
