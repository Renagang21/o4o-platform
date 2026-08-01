/**
 * PaymentFailPage — Toss 결제 실패·취소 리다이렉트
 *
 * WO-PHARMACY-HUB-STORE-OWNER-CHECKOUT-AND-PAYMENT-UI-V1
 *
 * 경로: /store-owner/payment/fail?paymentGroupId=...&code=...&message=...
 *
 * 결제 실패는 **주문 실패가 아니다** — 주문은 미결제 상태로 남아 있어
 * 다시 결제하거나 취소할 수 있다. 이 구분을 화면에서 분명히 한다.
 */
import { Link, useSearchParams } from 'react-router-dom';

/** Toss 가 돌려주는 대표 실패 코드의 사용자 문구 */
const CODE_MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED: '결제를 취소하셨습니다.',
  PAY_PROCESS_ABORTED: '결제가 중단되었습니다.',
  REJECT_CARD_COMPANY: '카드사에서 결제를 거절했습니다. 다른 카드로 시도해 주세요.',
  INVALID_CARD_EXPIRATION: '카드 유효기간을 확인해 주세요.',
  EXCEED_MAX_DAILY_PAYMENT_COUNT: '일일 결제 한도를 초과했습니다.',
};

export default function PaymentFailPage() {
  const [searchParams] = useSearchParams();
  const paymentGroupId = searchParams.get('paymentGroupId');
  const code = searchParams.get('code');
  const message = searchParams.get('message');

  const reason =
    (code && CODE_MESSAGES[code]) || message || '결제가 완료되지 않았습니다.';

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h2 className="mb-2 text-xl font-bold">결제가 완료되지 않았습니다</h2>
      <p className="mb-2 text-sm text-gray-600">{reason}</p>
      <p className="mb-8 text-sm text-gray-500">
        주문은 <strong>미결제 상태로 남아 있습니다.</strong> 다시 결제하거나 주문 내역에서 취소할 수
        있습니다. 공급자에게는 아직 전달되지 않았습니다.
      </p>

      <div className="flex justify-center gap-3">
        {paymentGroupId && (
          <Link
            to={`/store-owner/payment?paymentGroupId=${encodeURIComponent(paymentGroupId)}`}
            className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white"
          >
            다시 결제하기
          </Link>
        )}
        <Link
          to="/store-owner/orders"
          className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700"
        >
          주문 내역
        </Link>
      </div>

      {code && <p className="mt-6 text-xs text-gray-400">오류 코드: {code}</p>}
    </div>
  );
}
