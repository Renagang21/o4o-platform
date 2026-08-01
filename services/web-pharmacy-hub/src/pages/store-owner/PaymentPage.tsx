/**
 * PaymentPage (약국 경영자) — paymentGroupId 단위 1회 결제
 *
 * WO-PHARMACY-HUB-STORE-OWNER-CHECKOUT-AND-PAYMENT-UI-V1
 *
 * 경로: /store-owner/payment?paymentGroupId=...
 * 흐름: prepare(paymentGroupId) → Toss 결제창 → success / fail 리다이렉트
 *
 * 금액 규칙: 화면에 띄우고 Toss 에 넘기는 금액은 **prepare 응답값** 하나뿐이다.
 *   장바구니 표시액이나 프론트 계산값을 결제에 사용하지 않는다.
 *
 * 중복 결제 방지:
 *   · prepare 는 마운트당 1회만 실행한다(StrictMode 이중 실행·새로고침 재요청 방지).
 *   · 결제 버튼은 요청 시작과 동시에 잠근다.
 *   · 서버도 이미 결제된 그룹을 `PAYMENT_GROUP_NOT_PAYABLE` 로 거부한다(이중 방어).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  preparePayment,
  loadTossWidget,
  errorMessage,
  type FailedItem,
  type PreparePaymentResult,
} from '../../lib/api/pharmacyHubOrders';
import { BRAND } from '../../config/service';

const won = (v: number) => `${v.toLocaleString('ko-KR')}원`;

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const paymentGroupId = searchParams.get('paymentGroupId');
  const failedItems = (location.state as { failedItems?: FailedItem[] } | null)?.failedItems ?? [];

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prep, setPrep] = useState<PreparePaymentResult | null>(null);

  /** prepare 중복 실행 방지 */
  const preparedRef = useRef(false);
  /** 결제 요청 중복 실행 방지 */
  const payingRef = useRef(false);

  useEffect(() => {
    if (!paymentGroupId) {
      setError('결제 정보가 없습니다. 장바구니에서 다시 시도해 주세요.');
      setLoading(false);
      return;
    }
    if (preparedRef.current) return;
    preparedRef.current = true;

    let alive = true;
    (async () => {
      try {
        const origin = window.location.origin;
        const g = encodeURIComponent(paymentGroupId);
        const result = await preparePayment({
          paymentGroupId,
          successUrl: `${origin}/store-owner/payment/success?paymentGroupId=${g}`,
          failUrl: `${origin}/store-owner/payment/fail?paymentGroupId=${g}`,
        });
        if (alive) setPrep(result);
      } catch (err) {
        if (alive) setError(errorMessage(err, '결제 준비 중 오류가 발생했습니다.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [paymentGroupId]);

  const handlePay = useCallback(async () => {
    if (!paymentGroupId || !prep || payingRef.current) return;
    if (!prep.clientKey) {
      setError('결제 설정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    payingRef.current = true;
    setProcessing(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const g = encodeURIComponent(paymentGroupId);
      const toss = await loadTossWidget(prep.clientKey);
      // Toss orderId 슬롯 = paymentGroupId (그룹 1회 결제). 금액은 prepare 응답값 그대로.
      await toss.requestPayment('카드', {
        amount: prep.amount,
        orderId: paymentGroupId,
        orderName: `${BRAND.nameKo} 주문 ${prep.orderCount}건`,
        successUrl: `${origin}/store-owner/payment/success?paymentGroupId=${g}&paymentId=${encodeURIComponent(prep.paymentId)}`,
        failUrl: `${origin}/store-owner/payment/fail?paymentGroupId=${g}`,
      });
    } catch (err) {
      // 사용자가 결제창을 닫은 경우는 오류가 아니다 — 다시 시도할 수 있게 풀어준다.
      if ((err as { code?: string })?.code === 'USER_CANCEL') {
        payingRef.current = false;
        setProcessing(false);
        return;
      }
      setError(errorMessage(err, '결제 처리 중 오류가 발생했습니다.'));
      payingRef.current = false;
      setProcessing(false);
    }
  }, [paymentGroupId, prep]);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-4 text-xl font-bold">결제</h1>

      {loading && <p className="text-sm text-gray-500">결제 정보를 불러오는 중…</p>}

      {!loading && error && (
        <>
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/store-owner/cart')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
            >
              장바구니로
            </button>
            <button
              type="button"
              onClick={() => navigate('/store-owner/orders')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
            >
              주문 내역
            </button>
          </div>
        </>
      )}

      {!loading && !error && prep && (
        <div className="space-y-4">
          {failedItems.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="mb-1 font-semibold">주문에서 제외된 상품</p>
              <ul className="list-disc pl-5">
                {failedItems.map((f) => (
                  <li key={f.itemId}>
                    {f.productName} — {f.reason}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs">제외된 상품은 장바구니에 남아 있습니다.</p>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">공급자별 주문</span>
              <span>{prep.orderCount}건</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="font-semibold">총 결제 예정 금액</span>
              <span className="text-xl font-bold text-emerald-600">{won(prep.amount)}</span>
            </div>
            {prep.isTestMode && (
              <p className="mt-2 text-xs text-amber-700">테스트 결제 모드입니다.</p>
            )}
          </div>

          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            여러 공급자의 주문을 한 번에 결제합니다. 배송비는 공급자별로 계산되어 총액에 포함됩니다.
            <br />
            <strong>결제가 완료된 뒤에만</strong> 공급자에게 주문이 전달됩니다.
          </div>

          <button
            type="button"
            onClick={handlePay}
            disabled={processing}
            className={`w-full rounded-xl px-4 py-3 text-base font-bold text-white ${
              processing ? 'cursor-not-allowed bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {processing ? '결제창을 여는 중…' : `${won(prep.amount)} 결제하기`}
          </button>

          <p className="text-center text-sm">
            <Link to="/store-owner/orders" className="text-gray-500 underline">
              나중에 결제하기 (주문 내역으로)
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
