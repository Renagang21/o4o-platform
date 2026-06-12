/**
 * PharmacyOrders — 내 매장 구매/발주 내역 (buyer)
 *
 * IR-O4O-STORE-ORDER-DIRECTION-SEMANTICS-CROSSSERVICE-V1 / WO-...-BUYER-LEDGER-REPOINT-V1:
 *   "내 매장 주문 내역" canonical = buyer(구매/발주 내역). buyerId 기준 checkout_orders 조회.
 *   (기존 deprecated stub /glycopharm/pharmacy/orders + seller 풀필먼트 UI 제거.
 *    seller "받은 주문/판매 이행" 은 별도 화면으로 분리 — 본 화면 범위 외.)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
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
  const s = (order.status || '').toLowerCase();
  const p = (order.paymentStatus || '').toLowerCase();
  if (s === 'cancelled' || s === 'canceled' || s === 'refunded') {
    return { key: 'cancelled', label: s === 'refunded' ? '환불' : '취소', color: 'red', icon: XCircle };
  }
  if (p === 'paid' || s === 'paid' || s === 'completed' || s === 'fulfilled') {
    return { key: 'paid', label: '결제완료', color: 'green', icon: CheckCircle2 };
  }
  return { key: 'pending', label: '결제대기', color: 'yellow', icon: Clock };
}

const statusTabs: { key: 'all' | DerivedKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'paid', label: '결제완료' },
  { key: 'pending', label: '결제대기' },
  { key: 'cancelled', label: '취소/환불' },
];

interface BuyerOrdersKpi {
  total: number;
  paid: number;
  monthlyAmount: number;
}

export default function PharmacyOrders() {
  const [orders, setOrders] = useState<CheckoutOrderSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpi, setKpi] = useState<BuyerOrdersKpi | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | DerivedKey>('all');

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, CheckoutOrderDetail | 'loading'>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pharmacyApi.getCheckoutOrders({ limit: 100 });
      if (res.success) {
        const items = res.data ?? [];
        setOrders(items);
        setTotalCount(res.pagination?.total ?? items.length);

        // KPI — buyer 관점: 총 주문 / 결제완료 / 이번 달 주문액
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const paid = items.filter((o) => deriveState(o).key === 'paid').length;
        const monthlyAmount = items
          .filter((o) => new Date(o.createdAt) >= monthStart && deriveState(o).key !== 'cancelled')
          .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        setKpi({ total: res.pagination?.total ?? items.length, paid, monthlyAmount });
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

  const toggleExpand = async (orderId: string) => {
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
  };

  // 검색(주문번호) + 상태 필터 — client-side
  const filtered = orders.filter((o) => {
    if (selectedStatus !== 'all' && deriveState(o).key !== selectedStatus) return false;
    if (debouncedSearch && !o.orderNumber.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">구매/발주 내역</h1>
        <p className="text-slate-500 text-sm">
          {loading ? '불러오는 중...' : `매장 허브에서 주문한 O4O 상품·이벤트 오퍼 내역 (총 ${totalCount}건)`}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-xs font-medium text-slate-500">총 주문</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{kpi ? kpi.total.toLocaleString() : '—'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-xs font-medium text-slate-500">결제완료</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{kpi ? kpi.paid.toLocaleString() : '—'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-xs font-medium text-slate-500">이번 달 주문액</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {kpi ? `₩${kpi.monthlyAmount.toLocaleString()}` : '—'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="주문번호로 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === tab.key
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">오류가 발생했습니다</h3>
          <p className="text-slate-500 mb-4">{error}</p>
          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((order) => {
            const state = deriveState(order);
            const StateIcon = state.icon;
            const isExpanded = expandedOrder === order.id;
            const detail = detailMap[order.id];

            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Row */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-${state.color}-100 flex items-center justify-center`}>
                      <StateIcon className={`w-5 h-5 text-${state.color}-600`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{order.orderNumber}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${state.color}-100 text-${state.color}-700`}>
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
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Detail (read-only) */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t bg-slate-50">
                    {detail === 'loading' || !detail ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4 pt-2">
                        {/* Items */}
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-2">주문 상품</h4>
                          <div className="space-y-2">
                            {(detail.items ?? []).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg">
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
                          <h4 className="text-sm font-medium text-slate-700 mb-2">결제 요약</h4>
                          <div className="p-3 bg-white rounded-lg space-y-1 text-sm">
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
                            <div className="flex justify-between font-semibold text-slate-800 pt-1 border-t mt-1">
                              <span>총 결제금액</span><span>{(detail.totalAmount || 0).toLocaleString()}원</span>
                            </div>
                            <div className="flex justify-between text-slate-500 pt-1">
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
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">주문 내역이 없습니다</h3>
          <p className="text-slate-500">
            {debouncedSearch || selectedStatus !== 'all'
              ? '검색 조건에 맞는 주문이 없습니다.'
              : '매장 허브에서 O4O 주문 가능 상품을 장바구니에 담아 주문하면 이곳에서 확인할 수 있습니다.'}
          </p>
        </div>
      )}
    </div>
  );
}
