/**
 * 장바구니 · 주문 확정 · 결제 — DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §8
 *
 *   GET    /api/v1/neture/pharmacy/cart               담긴 항목 + 지금 이용 가능 여부 · 현재 단가(서버 재판정)
 *   PATCH  /api/v1/neture/pharmacy/cart/items/:id     수량 변경
 *   DELETE /api/v1/neture/pharmacy/cart/items/:id     삭제
 *   POST   /api/v1/neture/pharmacy/cart/checkout      주문 확정 → 결제 그룹(수취 주체별) · 실패 항목
 * 단가 · 이용 가능 여부는 주문 확정 시 서버가 다시 판정한다. 화면의 금액은 표시용이다.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  neturePharmacyApi,
  pharmacyErrorMessage,
  type CheckoutResult,
  type PharmacyCartItem,
} from '../../api/neturePharmacy';
import { Notice, PharmacyPage, SUPPLY_KIND_LABEL, btn, formatWon, pharmacyStorePath } from './shared';
import { PaymentGroupPay, usePaymentMode } from './PaymentGroupPay';

export default function PharmacyCartPage() {
  const mode = usePaymentMode();
  const [items, setItems] = useState<PharmacyCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await neturePharmacyApi.getCart();
      setItems(rows);
      setQty(Object.fromEntries(rows.map((r) => [r.id, String(r.quantity)])));
    } catch (e) {
      setError(pharmacyErrorMessage(e, '장바구니를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateQty = async (item: PharmacyCartItem) => {
    const n = Number(qty[item.id]);
    if (!Number.isInteger(n) || n < 1) {
      setError('수량을 1 이상의 정수로 입력해 주세요.');
      return;
    }
    if (n === item.quantity) return;
    setBusyId(item.id);
    setError(null);
    try {
      await neturePharmacyApi.updateCartItem(item.id, n);
      await load();
    } catch (e) {
      setError(pharmacyErrorMessage(e, '수량을 바꾸지 못했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: PharmacyCartItem) => {
    setBusyId(item.id);
    setError(null);
    try {
      await neturePharmacyApi.removeCartItem(item.id);
      await load();
    } catch (e) {
      setError(pharmacyErrorMessage(e, '삭제하지 못했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  const available = items.filter((i) => i.available);
  const unavailableCount = items.length - available.length;
  const estimate = available.reduce((s, i) => s + (i.unitPrice ?? 0) * i.quantity, 0);

  const checkout = async () => {
    if (checkingOut || available.length === 0) return;
    setCheckingOut(true);
    setError(null);
    setResult(null);
    try {
      setResult(await neturePharmacyApi.checkout(available.map((i) => i.id)));
      await load();
    } catch (e) {
      setError(pharmacyErrorMessage(e, '주문을 확정하지 못했습니다.'));
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <PharmacyPage
      title="장바구니"
      description="담은 공급 상품을 확인하고 주문을 확정합니다. 주문 확정 시 단가와 이용 가능 여부를 다시 확인합니다."
      actions={<>
        <Link className={btn.secondary} to={pharmacyStorePath('supply')}>공급 상품</Link>
        <Link className={btn.secondary} to={pharmacyStorePath('orders')}>주문 내역</Link>
      </>}
    >
      {error && <Notice tone="error">{error}</Notice>}

      {result && (
        <section className="mb-6 rounded-lg border border-emerald-200 bg-white p-4" data-testid="checkout-result">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">주문 확정 결과</h2>
          {result.createdOrders.length > 0
            ? <p className="mb-3 text-sm text-gray-700">주문 {result.createdOrders.length}건이 만들어졌습니다. 결제 그룹별로 결제해 주세요.</p>
            : <p className="mb-3 text-sm text-gray-700">만들어진 주문이 없습니다.</p>}
          {result.paymentGroups.map((g, idx) => (
            <div key={g.paymentGroupId} className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
              <div>
                <strong>결제 그룹 {idx + 1}</strong> · 주문 {g.orderIds.length}건 · {formatWon(g.totalAmount)}
                {!g.receiverDetermined && <span className="ml-2 text-xs text-gray-500">(수취 주체 미확정)</span>}
              </div>
              <PaymentGroupPay paymentGroupId={g.paymentGroupId} amount={g.totalAmount} mode={mode} />
            </div>
          ))}
          {result.failedItems.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-red-700">주문하지 못한 항목</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-red-700">
                {result.failedItems.map((f) => <li key={f.itemId}>{f.productName}: {f.message}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      {loading ? (
        <p className="py-12 text-center text-gray-500">불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          <p>장바구니가 비어 있습니다.</p>
          <p className="mt-1"><Link className="underline" to={pharmacyStorePath('supply')}>공급 상품 보기</Link></p>
        </div>
      ) : (
        <>
          {unavailableCount > 0 && (
            <Notice tone="warn">지금 주문할 수 없는 항목이 {unavailableCount}건 있습니다(공급 종료 · 기간 만료 · 세미프랜차이즈 가입 변경 등). 이 항목은 주문 확정에서 제외됩니다.</Notice>
          )}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                  <th className="px-4 py-3 font-medium">제품</th>
                  <th className="px-4 py-3 font-medium">공급 경로 · 공급자</th>
                  <th className="px-4 py-3 text-right font-medium">단가</th>
                  <th className="w-40 px-4 py-3 text-center font-medium">수량</th>
                  <th className="px-4 py-3 text-right font-medium">금액</th>
                  <th className="px-4 py-3 text-center font-medium">삭제</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className={`border-b border-gray-100 last:border-0 ${i.available ? '' : 'bg-gray-50 text-gray-400'}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{i.productName}</span>
                      {!i.available && <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">주문 불가</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {i.option ? <>
                        <div>{i.option.semiFranchiseName} · {SUPPLY_KIND_LABEL[i.option.kind] ?? i.option.kind}</div>
                        <div className="text-gray-500">{i.option.supplierName}</div>
                      </> : (i.kind ? SUPPLY_KIND_LABEL[i.kind] : '-')}
                    </td>
                    <td className="px-4 py-3 text-right">{i.unitPrice != null ? formatWon(i.unitPrice) : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min={1}
                          aria-label={`${i.productName} 수량`}
                          value={qty[i.id] ?? String(i.quantity)}
                          onChange={(e) => setQty((prev) => ({ ...prev, [i.id]: e.target.value }))}
                          disabled={!i.available || busyId === i.id}
                          className="w-16 rounded border border-gray-300 px-2 py-1 text-right"
                        />
                        <button className={btn.secondary} disabled={!i.available || busyId === i.id || qty[i.id] === String(i.quantity)} onClick={() => updateQty(i)}>변경</button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{i.unitPrice != null ? formatWon(i.unitPrice * i.quantity) : '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button className={btn.danger} disabled={busyId === i.id} onClick={() => remove(i)}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-4">
            <span className="text-sm text-gray-700">주문 가능 {available.length}건 · 예상 상품 금액 {formatWon(estimate)} <span className="text-xs text-gray-500">(배송비 별도 · 확정 시 재계산)</span></span>
            <button className={btn.primary} disabled={checkingOut || available.length === 0} onClick={checkout} data-testid="cart-checkout">
              {checkingOut ? '주문 확정 중...' : '주문 확정'}
            </button>
          </div>
        </>
      )}
    </PharmacyPage>
  );
}
