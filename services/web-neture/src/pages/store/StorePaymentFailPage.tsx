/**
 * StorePaymentFailPage — Toss 결제 실패 redirect
 *
 * WO-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-V1 (P2d-1)
 * 경로: /store/payment/fail?paymentGroupId=pg_xxx&code=...&message=...
 */
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function StorePaymentFailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentGroupId = searchParams.get('paymentGroupId');
  const message = searchParams.get('message');

  return (
    <div className="mx-auto max-w-xl p-8 text-center">
      <h2 className="mb-2 text-xl font-semibold text-gray-900">결제에 실패했습니다</h2>
      <p className="mb-1 text-sm text-gray-600">주문은 공급자에게 전달되지 않았습니다.</p>
      {message && <p className="mb-6 text-sm text-gray-500">{message}</p>}
      <div className="mt-4 flex justify-center gap-3">
        {paymentGroupId && (
          <button
            type="button"
            onClick={() => navigate(`/store/payment?paymentGroupId=${encodeURIComponent(paymentGroupId)}`)}
            className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white"
          >
            다시 결제하기
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/store/cart')}
          className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700"
        >
          장바구니로 이동
        </button>
      </div>
    </div>
  );
}
