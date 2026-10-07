/**
 * 결제 그룹 결제 버튼 — DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §8-3
 *
 *   POST /api/v1/neture/pharmacy/payments/prepare {paymentGroupId}            → {paymentId, amount, mode}
 *   POST /api/v1/neture/pharmacy/payments/confirm {paymentId, paymentGroupId} → {status:'PAID', testPayment, ...}
 *
 * 결제 모드는 서버가 정한다(`/pharmacy/store/context` 의 paymentMode).
 *   test     → PG 호출 없는 테스트 결제. 실제 결제가 아님을 화면에 분명히 표시한다.
 *   live     → PG 미선정(503 PAYMENT_PROVIDER_NOT_SELECTED) — 결제 불가 안내.
 *   disabled → 결제 미설정(503 PAYMENT_NOT_CONFIGURED) — 결제 불가 안내.
 * 서버가 거부하면 성공으로 보이지 않는다(오류 문구를 그대로 보여준다).
 */
import { useEffect, useState } from 'react';
import { neturePharmacyApi, pharmacyErrorCode, pharmacyErrorMessage, type PaymentMode } from '../../api/neturePharmacy';
import { btn, formatWon } from './shared';

const UNAVAILABLE_TEXT: Record<string, string> = {
  PAYMENT_NOT_CONFIGURED: '결제가 아직 설정되지 않아 결제할 수 없습니다.',
  PAYMENT_PROVIDER_NOT_SELECTED: '결제 대행사(PG)가 아직 정해지지 않아 결제할 수 없습니다.',
};

/** null = 확인 중 · 'unknown' = 조회 실패 */
export type PaymentModeState = PaymentMode | 'unknown' | null;

/** 서버가 정한 결제 모드 — `/pharmacy/store/context` */
export function usePaymentMode(): PaymentModeState {
  const [mode, setMode] = useState<PaymentModeState>(null);
  useEffect(() => {
    let alive = true;
    neturePharmacyApi.getStoreContext()
      .then((c) => { if (alive) setMode(c.paymentMode); })
      .catch(() => { if (alive) setMode('unknown'); });
    return () => { alive = false; };
  }, []);
  return mode;
}

export function paymentUnavailableText(mode: PaymentModeState): string | null {
  if (mode === 'unknown') return '결제 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.';
  if (mode === 'disabled') return UNAVAILABLE_TEXT.PAYMENT_NOT_CONFIGURED;
  if (mode === 'live') return UNAVAILABLE_TEXT.PAYMENT_PROVIDER_NOT_SELECTED;
  return null;
}

export function PaymentGroupPay({
  paymentGroupId,
  amount,
  mode,
  onPaid,
}: {
  paymentGroupId: string;
  amount: number;
  mode: PaymentModeState;
  onPaid?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState<{ testPayment: boolean } | null>(null);

  const unavailable = paymentUnavailableText(mode);

  const pay = async () => {
    if (busy || mode !== 'test') return;
    if (!window.confirm(`테스트 결제를 진행합니다. 실제 결제가 아니며 공급자 지급 · 정산 근거가 아닙니다.\n결제 금액 ${formatWon(amount)}`)) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = await neturePharmacyApi.preparePayment(paymentGroupId);
      const confirmed = await neturePharmacyApi.confirmPayment(prepared.paymentId, paymentGroupId);
      if (confirmed.status !== 'PAID') throw new Error('결제가 완료되지 않았습니다.');
      setPaid({ testPayment: confirmed.testPayment });
      onPaid?.();
    } catch (e) {
      const code = pharmacyErrorCode(e);
      setError((code && UNAVAILABLE_TEXT[code]) || pharmacyErrorMessage(e, '결제를 처리하지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  };

  if (paid) {
    return (
      <span className="text-sm font-medium text-emerald-700" data-testid="payment-done">
        결제 완료{paid.testPayment ? ' (테스트 결제 — 실제 결제 아님)' : ''}
      </span>
    );
  }
  if (unavailable) return <span className="text-sm text-amber-700" data-testid="payment-unavailable">{unavailable}</span>;
  if (mode === null) return <span className="text-sm text-gray-500">결제 정보를 확인하는 중...</span>;

  return (
    <div>
      <button className={btn.primary} disabled={busy} onClick={pay} data-testid="payment-test-button">
        {busy ? '결제 처리 중...' : `테스트 결제 (실제 결제 아님) · ${formatWon(amount)}`}
      </button>
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
