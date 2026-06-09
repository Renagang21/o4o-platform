/**
 * StoreCartPage — 내 장바구니 (GlycoPharm)
 *
 * WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2
 *
 * canonical Store Cart 의 매장 경영자(buyer) 확인/확정 화면. 공급자별 묶음 조회·수량변경·삭제·
 * 비우기 + 주문 확정(공급자별 checkout_order 생성). priceSnapshot 은 표시용 — 확정 시 재검증.
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { storeCartApi, type SupplierGroup, type CheckoutConfirmResult } from '@/api/storeCart';
import { CART_SERVICE_KEY } from '@/utils/eventOfferCart';

const won = (n: number | null | undefined) => '₩' + Number(n ?? 0).toLocaleString('ko-KR');

export function StoreCartPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<SupplierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<CheckoutConfirmResult | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await storeCartApi.groupBySupplier(CART_SERVICE_KEY);
      setGroups(res.data.groups);
    } catch (err: any) {
      toast.error(err?.message || '장바구니를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeQty = async (id: string, quantity: number) => {
    if (quantity < 1 || busy) return;
    setBusy(true);
    try {
      await storeCartApi.updateQuantity(CART_SERVICE_KEY, id, quantity);
      await load();
    } catch (err: any) {
      toast.error(err?.message || '수량 변경에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await storeCartApi.removeItem(CART_SERVICE_KEY, id);
      await load();
    } catch (err: any) {
      toast.error(err?.message || '삭제에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (busy || groups.length === 0) return;
    setBusy(true);
    try {
      await storeCartApi.clear(CART_SERVICE_KEY);
      await load();
    } catch (err: any) {
      toast.error(err?.message || '비우기에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const confirmCheckout = async () => {
    if (confirming || busy || groups.length === 0) return;
    setConfirming(true);
    setResult(null);
    try {
      const res = await storeCartApi.checkoutConfirm(CART_SERVICE_KEY);
      setResult(res.data);
      if (res.data.createdOrders.length > 0)
        toast.success(`${res.data.createdOrders.length}개 공급자 주문이 생성되었습니다.`);
      if (res.data.failedItems.length > 0)
        toast.error(`${res.data.failedItems.length}개 항목은 주문하지 못했습니다.`);
      await load();
    } catch (err: any) {
      toast.error(err?.message || '주문 확정에 실패했습니다.');
    } finally {
      setConfirming(false);
    }
  };

  const grandTotal = groups.reduce((s, g) => s + g.displaySubtotal, 0);
  const itemCount = groups.reduce((s, g) => s + g.itemCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">내 장바구니</h1>
        <p className="text-slate-500 mt-1 text-sm">담은 상품을 확인하고 공급자별로 주문을 확정합니다.</p>
      </div>

      {/* 주문 확정 결과 */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-3">
          {result.createdOrders.length > 0 && (
            <div>
              <p className="text-sm font-bold text-green-700 mb-2">✅ 생성된 주문 (공급자별)</p>
              {result.createdOrders.map((o) => (
                <div
                  key={o.orderId}
                  className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 text-sm"
                >
                  <span className="font-semibold text-slate-800 flex-1">{o.orderNumber}</span>
                  <span className="text-xs text-slate-500">
                    {o.itemCount}개 · 배송비 {won(o.shippingFee)}
                  </span>
                  <span className="font-bold text-slate-900 w-24 text-right">{won(o.totalAmount)}</span>
                </div>
              ))}
            </div>
          )}
          {result.failedItems.length > 0 && (
            <div>
              <p className="text-sm font-bold text-red-700 mb-1">⚠️ 주문하지 못한 항목</p>
              {result.failedItems.map((f) => (
                <p key={f.itemId} className="text-sm text-red-600">· {f.message}</p>
              ))}
              <p className="text-xs text-slate-500 mt-1">실패한 항목은 장바구니에 그대로 남아 있습니다.</p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 size={28} className="animate-spin text-teal-600" />
        </div>
      ) : itemCount === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 text-center py-16 text-slate-500">
          <ShoppingCart size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-sm">장바구니가 비어 있습니다.</p>
          <button
            type="button"
            onClick={() => navigate('/store-hub/event-offers')}
            className="mt-4 px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700"
          >
            이벤트 상품 보기
          </button>
        </div>
      ) : (
        <>
          {groups.map((group) => (
            <div
              key={group.supplierId ?? '__no_supplier__'}
              className="bg-white rounded-xl border border-slate-100 p-5"
            >
              <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-700">
                  공급자 {group.supplierId ? `#${group.supplierId}` : '미지정'}
                </span>
                <span className="text-sm font-semibold text-slate-900">{won(group.displaySubtotal)}</span>
              </div>
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                    <p className="text-xs text-slate-400">
                      {item.sourceType === 'event_offer' ? '이벤트' : item.sourceType} · {won(item.priceSnapshot)}
                    </p>
                  </div>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      disabled={busy || item.quantity <= 1}
                      onClick={() => changeQty(item.id, item.quantity - 1)}
                      className="w-8 h-8 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                    >
                      −
                    </button>
                    <span className="w-9 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => changeQty(item.id, item.quantity + 1)}
                      className="w-8 h-8 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-24 text-right text-sm font-semibold text-slate-900">
                    {won(item.priceSnapshot * item.quantity)}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(item.id)}
                    className="text-slate-400 hover:text-red-500 disabled:opacity-40"
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ))}

          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-base font-semibold text-slate-700">표시 합계 ({itemCount}개)</span>
              <span className="text-xl font-bold text-slate-900">{won(grandTotal)}</span>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              표시 금액은 담을 때의 스냅샷입니다. 최종 가격·재고·배송비는 주문 확정 시 공급자별로 다시
              검증되어 공급자 단위 주문으로 생성됩니다.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={confirming || busy}
                onClick={confirmCheckout}
                className="px-6 py-3 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {confirming ? '주문 확정 중...' : '주문 확정'}
              </button>
              <button
                type="button"
                disabled={busy || confirming}
                onClick={clearAll}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-60"
              >
                장바구니 비우기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default StoreCartPage;
