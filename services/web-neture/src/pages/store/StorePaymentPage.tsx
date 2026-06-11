/**
 * StorePaymentPage — Neture B2B 결제 (paymentGroupId 기준 1회 결제)
 *
 * WO-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-V1 (P2d-1)
 *
 * 경로: /store/payment?paymentGroupId=pg_xxx
 * 흐름: prepare(paymentGroupId) → Toss 결제 위젯 → success/fail redirect
 *
 * 다중 공급자 장바구니라도 사용자는 한 번 결제한다. 결제 단위 = paymentGroupId.
 * 결제 완료 후에만 공급자별 주문이 전달된다(payment-first).
 */
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { prepareB2BPayment, loadTossWidget } from '../../lib/api/netureB2bPayments';

export default function StorePaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentGroupId = searchParams.get('paymentGroupId');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prep, setPrep] = useState<{ amount: number; orderCount: number; clientKey?: string; paymentId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!paymentGroupId) {
      setError('결제 정보(paymentGroupId)가 없습니다. 장바구니에서 다시 시도해 주세요.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const origin = window.location.origin;
        const result = await prepareB2BPayment({
          paymentGroupId,
          successUrl: `${origin}/store/payment/success?paymentGroupId=${encodeURIComponent(paymentGroupId)}`,
          failUrl: `${origin}/store/payment/fail?paymentGroupId=${encodeURIComponent(paymentGroupId)}`,
        });
        if (cancelled) return;
        setPrep({ amount: result.amount, orderCount: result.orderCount, clientKey: result.clientKey, paymentId: result.paymentId });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || '결제 준비 중 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentGroupId]);

  const handlePay = useCallback(async () => {
    if (!paymentGroupId || !prep || processing) return;
    if (!prep.clientKey) {
      setError('결제 설정(clientKey)을 불러오지 못했습니다.');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const toss = await loadTossWidget(prep.clientKey);
      // Toss orderId 슬롯에 paymentGroupId 사용 (group 결제)
      await toss.requestPayment('카드', {
        amount: prep.amount,
        orderId: paymentGroupId,
        orderName: `Neture B2B 주문 ${prep.orderCount}건`,
        successUrl: `${origin}/store/payment/success?paymentGroupId=${encodeURIComponent(paymentGroupId)}&paymentId=${encodeURIComponent(prep.paymentId)}`,
        failUrl: `${origin}/store/payment/fail?paymentGroupId=${encodeURIComponent(paymentGroupId)}`,
      });
    } catch (e: any) {
      if (e?.code === 'USER_CANCEL') {
        setProcessing(false);
        return;
      }
      setError(e?.message || '결제 처리 중 오류가 발생했습니다.');
      setProcessing(false);
    }
  }, [paymentGroupId, prep, processing]);

  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-xl font-bold text-gray-900">결제</h1>

      {loading && <p className="text-gray-500">결제 정보를 불러오는 중입니다...</p>}

      {!loading && error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && prep && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-500">공급자별 주문</span>
              <span className="text-sm text-gray-900">{prep.orderCount}건</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="font-semibold text-gray-900">총 결제 예정 금액</span>
              <span className="text-xl font-bold text-emerald-600">{prep.amount.toLocaleString()}원</span>
            </div>
          </div>

          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            여러 공급자의 주문을 한 번에 결제합니다. 배송비는 공급자별로 계산되어 총액에 포함됩니다.
            <br />
            결제 완료 후 공급자별로 주문이 전달됩니다. 결제 전에는 공급자가 주문을 확인할 수 없습니다.
          </div>

          <button
            type="button"
            onClick={handlePay}
            disabled={processing}
            className={`w-full rounded-xl px-4 py-3 text-base font-bold text-white ${
              processing ? 'cursor-not-allowed bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {processing ? '처리 중...' : `${prep.amount.toLocaleString()}원 결제하기`}
          </button>
        </div>
      )}

      {!loading && error && (
        <button
          type="button"
          onClick={() => navigate('/store/cart')}
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
        >
          장바구니로 이동
        </button>
      )}
    </div>
  );
}
