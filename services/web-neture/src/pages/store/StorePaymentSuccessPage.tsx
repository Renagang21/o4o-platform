/**
 * StorePaymentSuccessPage — Toss 결제 성공 redirect → group confirm
 *
 * WO-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-V1 (P2d-1)
 *
 * 경로: /store/payment/success?paymentGroupId=pg_xxx&paymentKey=...&paymentId=...
 * confirm(paymentGroupId) → backend 가 group 내 checkout_order N건 paid 전이 + 공급자별 bridge.
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmB2BPayment } from '../../lib/api/netureB2bPayments';

export default function StorePaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [confirming, setConfirming] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // paymentGroupId 우선, 없으면 Toss 가 돌려준 orderId 를 paymentGroupId 로 해석
  const paymentGroupId = searchParams.get('paymentGroupId') || searchParams.get('orderId');
  const paymentKey = searchParams.get('paymentKey');
  const paymentId = searchParams.get('paymentId');

  useEffect(() => {
    let cancelled = false;
    if (!paymentKey || !paymentId || !paymentGroupId) {
      // 결제 파라미터 없음 — 이미 확인되었거나 직접 진입. 완료 화면만 표시.
      setConfirming(false);
      return;
    }
    (async () => {
      try {
        await confirmB2BPayment({ paymentId, paymentKey, paymentGroupId });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || '결제 확인 중 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setConfirming(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentKey, paymentId, paymentGroupId]);

  if (confirming) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="text-gray-500">결제를 확인하고 있습니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">결제 확인 실패</h2>
        <p className="mb-6 text-sm text-gray-600">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/store/orders')}
          className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white"
        >
          주문 내역 확인
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-8 text-center">
      <h2 className="mb-2 text-2xl font-bold text-gray-900">결제가 완료되었습니다</h2>
      <p className="mb-1 text-sm text-gray-600">공급자별 주문이 전달되었습니다.</p>
      <p className="mb-8 text-sm text-gray-600">공급자는 결제 완료된 주문만 확인할 수 있습니다.</p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/store/orders')}
          className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white"
        >
          주문 내역 보기
        </button>
        <button
          type="button"
          onClick={() => navigate('/store/cart')}
          className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700"
        >
          장바구니로
        </button>
      </div>
    </div>
  );
}
