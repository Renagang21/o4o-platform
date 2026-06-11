/**
 * StoreCartPage — O4O B2B 장바구니 (canonical Store Cart)
 *
 * WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1 (P2d-2)
 *
 * legacy localStorage cart + /neture/seller/orders 직접 주문 생성 → canonical Store Cart
 * (/api/v1/store/cart/neture/*) + checkout-confirm-b2b + paymentGroupId 결제 페이지 연결.
 *
 * payment-first: 결제 전 주문은 공급자에게 보이지 않는다. 다중 공급자라도 결제는 1회.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Minus, Plus, Package } from 'lucide-react';
import { storeCart, type SupplierGroupDto } from '../../lib/api/storeCart';

function won(v: number): string {
  return `₩${(Number(v) || 0).toLocaleString('ko-KR')}`;
}

export default function StoreCartPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<SupplierGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<Array<{ productName: string; reason: string }>>([]);

  const load = useCallback(async () => {
    try {
      const { groups } = await storeCart.listGroups();
      setGroups(groups);
      setError(null);
    } catch (e: any) {
      setError(e?.message || '장바구니를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const itemsSubtotal = groups.reduce((s, g) => s + g.displaySubtotal, 0);
  const shippingTotal = groups.reduce((s, g) => s + g.shipping.shippingFee, 0);
  const grandTotal = itemsSubtotal + shippingTotal;
  const itemCount = groups.reduce((s, g) => s + g.itemCount, 0);

  const onQty = useCallback(async (itemId: string, qty: number) => {
    if (qty < 1 || qty > 1000) return;
    setBusy(true);
    try {
      await storeCart.updateQuantity(itemId, qty);
      await load();
    } catch (e: any) {
      setError(e?.message || '수량 변경 실패');
    } finally {
      setBusy(false);
    }
  }, [load]);

  const onRemove = useCallback(async (itemId: string) => {
    setBusy(true);
    try {
      await storeCart.removeItem(itemId);
      await load();
    } catch (e: any) {
      setError(e?.message || '삭제 실패');
    } finally {
      setBusy(false);
    }
  }, [load]);

  const onClear = useCallback(async () => {
    setBusy(true);
    try {
      await storeCart.clear();
      await load();
    } catch (e: any) {
      setError(e?.message || '비우기 실패');
    } finally {
      setBusy(false);
    }
  }, [load]);

  const onCheckout = useCallback(async () => {
    if (busy || itemCount === 0) return;
    setBusy(true);
    setError(null);
    setFailed([]);
    try {
      const result = await storeCart.checkoutConfirmB2B();
      if (result.failedItems?.length) {
        setFailed(result.failedItems.map((f) => ({ productName: f.productName, reason: f.reason })));
      }
      if (result.createdOrders?.length && result.paymentGroupId) {
        navigate(`/store/payment?paymentGroupId=${encodeURIComponent(result.paymentGroupId)}`);
        return;
      }
      // 생성된 주문 없음(전부 실패) → cart 유지, 실패 사유 표시
      await load();
    } catch (e: any) {
      setError(e?.message || '주문 확정에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }, [busy, itemCount, navigate, load]);

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <ShoppingCart size={22} /> 장바구니
          {itemCount > 0 && <span className="rounded-full bg-emerald-100 px-2 text-sm text-emerald-700">{itemCount}</span>}
        </h1>
        {groups.length > 0 && (
          <button type="button" onClick={onClear} disabled={busy} className="text-sm text-gray-500 hover:text-gray-700">
            비우기
          </button>
        )}
      </div>

      {loading && <p className="text-gray-500">불러오는 중...</p>}
      {!loading && error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!loading && groups.length === 0 && !error && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          <Package size={28} className="mx-auto mb-2 text-gray-400" />
          장바구니가 비어 있습니다.
        </div>
      )}

      {!loading && failed.length > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-semibold">주문할 수 없는 항목이 있어 장바구니에 남겨두었습니다.</p>
          <ul className="mt-1 list-disc pl-5">
            {failed.map((f, i) => (
              <li key={i}>{f.productName}: {f.reason}</li>
            ))}
          </ul>
        </div>
      )}

      {!loading && groups.length > 0 && (
        <>
          {groups.map((g, gi) => (
            <div key={g.supplierId ?? `group-${gi}`} className="mb-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-2 text-sm font-semibold text-gray-700">공급자별 묶음 {gi + 1} · {g.itemCount}개 상품</div>
              {g.items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 border-b border-gray-50 py-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-gray-900">{it.productName}</div>
                    <div className="text-xs text-gray-500">{won(it.priceSnapshot)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => onQty(it.id, it.quantity - 1)} disabled={busy || it.quantity <= 1} className="rounded border border-gray-200 p-1 disabled:opacity-40">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm">{it.quantity}</span>
                    <button type="button" onClick={() => onQty(it.id, it.quantity + 1)} disabled={busy || it.quantity >= 1000} className="rounded border border-gray-200 p-1 disabled:opacity-40">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-900">{won(it.priceSnapshot * it.quantity)}</div>
                  <button type="button" onClick={() => onRemove(it.id)} disabled={busy} className="text-gray-400 hover:text-red-500" title="삭제">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="mt-2 space-y-1 border-t border-gray-100 pt-2 text-sm">
                <div className="flex justify-between text-gray-500"><span>상품금액</span><span>{won(g.displaySubtotal)}</span></div>
                <div className="flex justify-between text-gray-500">
                  <span>배송비</span>
                  <span>{g.shipping.freeShippingApplied ? '무료' : won(g.shipping.shippingFee)}</span>
                </div>
                {!g.shipping.freeShippingApplied && g.shipping.remainingForFreeShipping != null && (
                  <div className="text-xs text-emerald-600">{won(g.shipping.remainingForFreeShipping)} 더 담으면 무료배송</div>
                )}
                <div className="flex justify-between font-semibold text-gray-900"><span>공급자 합계</span><span>{won(g.displayTotal)}</span></div>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex justify-between text-sm text-gray-500"><span>상품 합계</span><span>{won(itemsSubtotal)}</span></div>
            <div className="flex justify-between text-sm text-gray-500"><span>배송비 합계</span><span>{won(shippingTotal)}</span></div>
            <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
              <span>총 결제 예정 금액</span><span className="text-emerald-600">{won(grandTotal)}</span>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
            여러 공급자의 상품도 한 번에 결제됩니다. 배송비는 공급자별 상품금액 기준으로 계산됩니다.
            <br />
            결제 완료 후 공급자에게 주문이 전달됩니다. 결제 전에는 공급자가 주문을 확인할 수 없습니다.
          </div>

          <button
            type="button"
            onClick={onCheckout}
            disabled={busy || itemCount === 0}
            className={`mt-3 w-full rounded-xl px-4 py-3 text-base font-bold text-white ${
              busy || itemCount === 0 ? 'cursor-not-allowed bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {busy ? '처리 중...' : `${won(grandTotal)} 결제 진행`}
          </button>
        </>
      )}
    </div>
  );
}
