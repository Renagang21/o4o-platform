/**
 * StoreB2bPayButton — 주문 확정 후 결제 개시 버튼
 *
 * WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1 §2-E-4
 *
 * payment-first: 장바구니 확정으로 만들어진 checkout_order 는 **결제 전까지 공급자에게
 * 전달되지 않는다**. 이 버튼이 결제를 개시하고, 결제 완료 이벤트가 backend 에서
 * checkout_order → paid → FulfillmentBridge → neture_order 로 이어준다.
 *
 * Event Offer(특가) 주문도 **같은 버튼·같은 경로**를 쓴다 — 전용 결제 UX 를 만들지 않는다.
 */
import { useState } from 'react';
import type { CheckoutConfirmResult } from '@o4o/store-ui-core';
import { startStoreB2bPayment } from '@/api/storeB2bPayments';

interface Props {
  result: CheckoutConfirmResult;
  /** 결제 성공 후 돌아올 경로 (기본: 현재 origin + /store-hub/orders) */
  returnPath?: string;
}

export function StoreB2bPayButton({ result, returnPath = '/store-hub/orders' }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orders = result.createdOrders ?? [];
  if (orders.length === 0) return null;

  const total = orders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
  const orderName =
    orders.length === 1 ? orders[0].orderNumber : `${orders[0].orderNumber} 외 ${orders.length - 1}건`;

  const onPay = async () => {
    setBusy(true);
    setError(null);
    try {
      const origin = window.location.origin;
      await startStoreB2bPayment({
        // 공급자별로 주문이 나뉘어도 결제는 1회 — backend 가 paymentGroupId 를 지원한다.
        ...(orders.length === 1 ? { orderId: orders[0].orderId } : {}),
        orderName,
        successUrl: `${origin}${returnPath}?payment=success`,
        failUrl: `${origin}${returnPath}?payment=fail`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '결제를 시작하지 못했습니다.');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onPay}
        disabled={busy || orders.length > 1}
        className="w-full rounded-lg bg-pink-600 px-4 py-3 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-50"
      >
        {busy ? '결제창을 여는 중...' : `결제하기 (${total.toLocaleString()}원)`}
      </button>
      {orders.length > 1 && (
        <p className="text-xs text-slate-500">
          공급자별로 주문이 나뉘었습니다. 주문 내역에서 각 주문을 결제해 주세요.
        </p>
      )}
      <p className="text-xs text-slate-500">
        결제가 완료되어야 공급자에게 주문이 전달됩니다.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default StoreB2bPayButton;
