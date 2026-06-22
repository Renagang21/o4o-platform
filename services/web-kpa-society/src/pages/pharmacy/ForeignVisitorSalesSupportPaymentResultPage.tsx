/**
 * 외국인 여행객 판매지원 — 구독 결제 결과 페이지 (KPA-Society 매장 측)
 * WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1 (Phase 2 frontend)
 *
 * Toss requestPayment 리다이렉트 착지점.
 * - success: Toss 가 paymentKey/orderId/amount, 우리가 paymentId/serviceKey 를 쿼리로 전달 → confirm 호출 → 이용권 ACTIVE.
 * - fail:    Toss 가 code/message 를 전달 → 실패 안내 + 재시도 링크.
 * 소비자 storefront 결제 결과 페이지와 분리된 전용 흐름이다.
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { confirmSubscription, type SubscriptionConfirmResult } from '../../api/storeServiceSubscription';

const ENTRY_PATH = '/store/sales-channels/foreign-visitor';

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function ForeignVisitorSalesSupportPaymentSuccessPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState<'confirming' | 'done' | 'error'>('confirming');
  const [result, setResult] = useState<SubscriptionConfirmResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    // StrictMode 이중 실행 방지 — confirm 은 idempotent 하지만 1회만 시도한다.
    if (ran.current) return;
    ran.current = true;

    const paymentId = params.get('paymentId');
    const paymentKey = params.get('paymentKey');
    const orderId = params.get('orderId');
    const serviceKey = params.get('serviceKey');

    if (!paymentId || !paymentKey || !orderId || !serviceKey) {
      setErrorMsg('결제 정보가 올바르지 않습니다. 다시 시도해 주세요.');
      setState('error');
      return;
    }

    confirmSubscription({ paymentId, paymentKey, orderId, serviceKey })
      .then((res) => {
        setResult(res);
        setState('done');
      })
      .catch((e) => {
        setErrorMsg(e instanceof Error ? e.message : '결제 승인 중 오류가 발생했습니다.');
        setState('error');
      });
  }, [params]);

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      {state === 'confirming' && (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> 결제를 확인하는 중입니다...
        </div>
      )}

      {state === 'done' && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-6 h-6 text-teal-600" />
            <span className="text-base font-semibold text-teal-800">결제가 완료되었습니다</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            외국인 여행객 판매지원 월 이용권이 활성화되었습니다.
          </p>
          {formatDate(result?.endsAt) && (
            <p className="mt-3 text-sm text-teal-800">
              이용 기간: <span className="font-semibold">{formatDate(result?.endsAt)}</span> 까지
            </p>
          )}
          <Link
            to={ENTRY_PATH}
            className="mt-6 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
          >
            판매지원 화면으로 이동
          </Link>
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <span className="text-base font-semibold text-amber-800">결제 확인에 실패했습니다</span>
          </div>
          <p className="text-sm text-amber-800 leading-relaxed">{errorMsg}</p>
          <Link
            to={ENTRY_PATH}
            className="mt-6 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50"
          >
            판매지원 화면으로 돌아가기
          </Link>
        </div>
      )}
    </div>
  );
}

export function ForeignVisitorSalesSupportPaymentFailPage() {
  const [params] = useSearchParams();
  const message = params.get('message') || '결제가 취소되었거나 완료되지 않았습니다.';
  const code = params.get('code');

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-6 h-6 text-amber-500" />
          <span className="text-base font-semibold text-amber-800">결제가 완료되지 않았습니다</span>
        </div>
        <p className="text-sm text-amber-800 leading-relaxed">{message}</p>
        {code && <p className="mt-1 text-xs text-amber-600">오류 코드: {code}</p>}
        <Link
          to={ENTRY_PATH}
          className="mt-6 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
        >
          다시 시도하기
        </Link>
      </div>
    </div>
  );
}

export default ForeignVisitorSalesSupportPaymentSuccessPage;
