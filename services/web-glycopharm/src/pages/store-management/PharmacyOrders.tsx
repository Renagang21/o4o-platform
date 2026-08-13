/**
 * PharmacyOrders — 내 매장 구매/발주 내역 (buyer)
 *
 * IR-O4O-STORE-ORDER-DIRECTION-SEMANTICS-CROSSSERVICE-V1 / WO-...-BUYER-LEDGER-REPOINT-V1:
 *   "내 매장 주문 내역" canonical = buyer(구매/발주 내역). buyerId 기준 checkout_orders 조회.
 *   (기존 deprecated stub /glycopharm/pharmacy/orders + seller 풀필먼트 UI 제거.
 *    seller "받은 주문/판매 이행" 은 별도 화면으로 분리 — 본 화면 범위 외.)
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1 §8:
 *   헤더 / KPI 3블록 / 검색 / 상태 필터 바 / loading·error·empty 뼈대를 KPA `StoreOrdersPage`
 *   와 공유하는 `BuyerOrderLedgerView` 로 이관했다. 여기 남는 것은 GlycoPharm 고유 config —
 *   결제 중심 파생 3상태(deriveState) 와 확장형 주문 카드 목록 뿐이다.
 *   데이터 소스(pharmacyApi.getCheckoutOrders)·문구·집계 정책 무변경.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, CheckCircle2, XCircle, ChevronDown, Loader2 } from 'lucide-react';
import { BuyerOrderLedgerView } from '@o4o/store-ui-core';
import {
  pharmacyApi,
  type CheckoutOrderSummary,
  type CheckoutOrderDetail,
} from '@/api/pharmacy';

/** buyer 관점 파생 상태 (결제 중심) */
type DerivedKey = 'paid' | 'pending' | 'cancelled';

function deriveState(order: { status: string; paymentStatus: string }): {
  key: DerivedKey;
  label: string;
  color: string;
  icon: typeof Clock;
} {
  // 라벨은 3서비스 공통 매핑(WO-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1)과 정렬.
  // GP 는 buyer 결제 중심 파생 상태를 유지(payment-aware collapse).
  const s = (order.status || '').toLowerCase();
  const p = (order.paymentStatus || '').toLowerCase();
  if (s === 'cancelled' || s === 'canceled' || s === 'refunded') {
    return { key: 'cancelled', label: s === 'refunded' ? '환불 완료' : '주문 취소', color: 'red', icon: XCircle };
  }
  if (p === 'paid' || s === 'paid' || s === 'completed' || s === 'fulfilled') {
    return { key: 'paid', label: '결제 완료', color: 'green', icon: CheckCircle2 };
  }
  return { key: 'pending', label: '결제 대기', color: 'yellow', icon: Clock };
}

const statusTabs: { key: 'all' | DerivedKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'paid', label: '결제 완료' },
  { key: 'pending', label: '결제 대기' },
  { key: 'cancelled', label: '주문 취소/환불' },
];

/** Tailwind JIT 수집을 위해 파생 상태 색을 정적 class 로 나열한다. */
const STATE_CLASSES: Record<DerivedKey, { chip: string; iconBox: string; icon: string }> = {
  paid: { chip: 'bg-green-100 text-green-700', iconBox: 'bg-green-100', icon: 'text-green-600' },
  pending: { chip: 'bg-yellow-100 text-yellow-700', iconBox: 'bg-yellow-100', icon: 'text-yellow-600' },
  cancelled: { chip: 'bg-red-100 text-red-700', iconBox: 'bg-red-100', icon: 'text-red-600' },
};

export default function PharmacyOrders() {
  const [orders, setOrders] = useState<CheckoutOrderSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, CheckoutOrderDetail | 'loading'>>({});

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pharmacyApi.getCheckoutOrders({ limit: 100 });
      if (res.success) {
        const items = res.data ?? [];
        setOrders(items);
        setTotalCount(res.pagination?.total ?? items.length);
      } else {
        throw new Error('주문 내역을 불러올 수 없습니다.');
      }
    } catch (err: any) {
      console.error('Buyer orders load error:', err);
      setError(err.message || '주문 내역을 불러오는데 실패했습니다.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const toggleExpand = useCallback(
    async (orderId: string) => {
      if (expandedOrder === orderId) {
        setExpandedOrder(null);
        return;
      }
      setExpandedOrder(orderId);
      if (!detailMap[orderId]) {
        setDetailMap((m) => ({ ...m, [orderId]: 'loading' }));
        try {
          const res = await pharmacyApi.getCheckoutOrderDetail(orderId);
          if (res.success && res.data) {
            setDetailMap((m) => ({ ...m, [orderId]: res.data as CheckoutOrderDetail }));
          } else {
            setDetailMap((m) => {
              const next = { ...m };
              delete next[orderId];
              return next;
            });
          }
        } catch {
          setDetailMap((m) => {
            const next = { ...m };
            delete next[orderId];
            return next;
          });
        }
      }
    },
    [expandedOrder, detailMap],
  );

  const renderList = useMemo(
    () => (rows: CheckoutOrderSummary[]) => (
      <div className="space-y-4">
        {rows.map((order) => {
          const state = deriveState(order);
          const cls = STATE_CLASSES[state.key];
          const StateIcon = state.icon;
          const isExpanded = expandedOrder === order.id;
          const detail = detailMap[order.id];

          return (
            <div key={order.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              {/* Row */}
              <div
                className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-slate-50"
                onClick={() => toggleExpand(order.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cls.iconBox}`}>
                    <StateIcon className={`h-5 w-5 ${cls.icon}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{order.orderNumber}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls.chip}`}>
                        {state.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      상품 {order.itemCount}개 · {new Date(order.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold text-slate-800">{(order.totalAmount || 0).toLocaleString()}원</p>
                  <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Detail (read-only) */}
              {isExpanded && (
                <div className="border-t bg-slate-50 px-4 pb-4 pt-2">
                  {detail === 'loading' || !detail ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                    </div>
                  ) : (
                    <div className="grid gap-4 pt-2 md:grid-cols-2">
                      {/* Items */}
                      <div>
                        <h4 className="mb-2 text-sm font-medium text-slate-700">주문 상품</h4>
                        <div className="space-y-2">
                          {(detail.items ?? []).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between rounded-lg bg-white p-2">
                              <span className="text-sm text-slate-700">{item.productName}</span>
                              <span className="text-sm text-slate-500">
                                {item.quantity}개 × {(item.unitPrice || 0).toLocaleString()}원
                              </span>
                            </div>
                          ))}
                          {(detail.items ?? []).length === 0 && (
                            <p className="text-sm text-slate-400">상품 정보가 없습니다.</p>
                          )}
                        </div>
                      </div>
                      {/* Amount summary */}
                      <div>
                        <h4 className="mb-2 text-sm font-medium text-slate-700">결제 요약</h4>
                        <div className="space-y-1 rounded-lg bg-white p-3 text-sm">
                          <div className="flex justify-between text-slate-600">
                            <span>상품 금액</span><span>{(detail.subtotal || 0).toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>배송비</span><span>{(detail.shippingFee || 0).toLocaleString()}원</span>
                          </div>
                          {(detail.discount || 0) > 0 && (
                            <div className="flex justify-between text-slate-600">
                              <span>할인</span><span>-{(detail.discount || 0).toLocaleString()}원</span>
                            </div>
                          )}
                          <div className="mt-1 flex justify-between border-t pt-1 font-semibold text-slate-800">
                            <span>총 결제금액</span><span>{(detail.totalAmount || 0).toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between pt-1 text-slate-500">
                            <span>결제 상태</span><span>{deriveState(detail).label}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    ),
    [expandedOrder, detailMap, toggleExpand],
  );

  return (
    <BuyerOrderLedgerView<CheckoutOrderSummary>
      orders={orders}
      loading={loading}
      error={error}
      onRetry={loadOrders}
      totalCount={totalCount}
      accent="blue"
      title="구매/발주 내역"
      description={({ loading: isLoading, totalCount: count }) =>
        isLoading
          ? '불러오는 중...'
          : `매장 허브에서 주문한 O4O 상품·이벤트 오퍼 내역 (총 ${count}건)`
      }
      statusTabs={statusTabs}
      matchStatus={(order, tabKey) => (tabKey === 'all' ? true : deriveState(order).key === tabKey)}
      isPaid={(order) => deriveState(order).key === 'paid'}
      isCancelled={(order) => deriveState(order).key === 'cancelled'}
      searchPlaceholder="주문번호로 검색..."
      renderList={renderList}
      empty={{
        title: '주문 내역이 없습니다',
        description:
          '매장 허브에서 O4O 주문 가능 상품을 장바구니에 담아 주문하면 이곳에서 확인할 수 있습니다.',
        filteredDescription: '검색 조건에 맞는 주문이 없습니다.',
      }}
    />
  );
}
