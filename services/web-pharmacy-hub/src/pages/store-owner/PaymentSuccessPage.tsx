/**
 * PaymentSuccessPage — Toss 결제 성공 리다이렉트 → 서버 승인(confirm)
 *
 * WO-PHARMACY-HUB-STORE-OWNER-CHECKOUT-AND-PAYMENT-UI-V1
 *
 * 경로: /store-owner/payment/success?paymentGroupId=...&paymentKey=...&paymentId=...
 *
 * confirm 이 성공해야 서버가 그룹 주문을 paid 로 전이하고 공급자에게 전달한다.
 * 이 화면이 결제 완료를 **선언**하지 않는다 — 서버 승인 결과만 표시한다.
 *
 * 중복 승인 방지: confirm 은 마운트당 1회만 실행한다. 새로고침 시에는 URL 의 결제
 * 파라미터가 이미 소비된 상태라 서버가 거부하므로, 그때는 주문 내역으로 안내한다.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPayment, errorMessage } from '../../lib/api/pharmacyHubOrders';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [confirming, setConfirming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const confirmedRef = useRef(false);

  // paymentGroupId 우선. 없으면 Toss 가 돌려준 orderId 를 paymentGroupId 로 해석한다.
  const paymentGroupId = searchParams.get('paymentGroupId') || searchParams.get('orderId');
  const paymentKey = searchParams.get('paymentKey');
  const paymentId = searchParams.get('paymentId');

  useEffect(() => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    if (!paymentKey || !paymentId || !paymentGroupId) {
      // 결제 파라미터 없이 진입(직접 접근·새로고침) — 승인 시도 없이 안내만 한다.
      setConfirming(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        await confirmPayment({ paymentId, paymentKey, paymentGroupId });
      } catch (err) {
        if (alive) setError(errorMessage(err, '결제 확인 중 오류가 발생했습니다.'));
      } finally {
        if (alive) setConfirming(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [paymentKey, paymentId, paymentGroupId]);

  if (confirming) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-gray-500">결제를 확인하고 있습니다…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h2 className="mb-2 text-lg font-semibold">결제 확인 실패</h2>
        <p className="mb-2 text-sm text-gray-600">{error}</p>
        <p className="mb-6 text-xs text-gray-500">
          결제가 승인되었는데 이 화면이 보인다면 주문 내역에서 상태를 확인해 주세요.
          중복 결제되지 않도록 결제를 다시 시도하지 마세요.
        </p>
        <button
          type="button"
          onClick={() => navigate('/store-owner/orders')}
          className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white"
        >
          주문 내역 확인
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h2 className="mb-2 text-2xl font-bold">결제가 완료되었습니다</h2>
      <p className="mb-1 text-sm text-gray-600">공급자에게 주문이 전달되었습니다.</p>
      <p className="mb-8 text-sm text-gray-600">공급자는 결제 완료된 주문만 확인할 수 있습니다.</p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/store-owner/orders')}
          className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white"
        >
          주문 내역 보기
        </button>
        <button
          type="button"
          onClick={() => navigate('/store-owner/products')}
          className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700"
        >
          계속 둘러보기
        </button>
      </div>
    </div>
  );
}
