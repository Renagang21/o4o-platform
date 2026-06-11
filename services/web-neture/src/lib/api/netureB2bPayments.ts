/**
 * Neture B2B Payment API client — paymentGroupId 기반 1회 결제
 *
 * WO-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-V1 (P2d-1)
 * 상위: CHECK-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1
 *
 * backend: /api/v1/neture/b2b/payments/{prepare,confirm} (sourceService='neture-b2b').
 * 다중 공급자 장바구니라도 사용자는 paymentGroupId 단위로 1회 결제한다.
 * collectionStatus / 후불 / 인보이스 미사용 (payment-first).
 */
import { api } from '../apiClient';

export interface B2BPreparePaymentResult {
  paymentId: string;
  transactionId?: string;
  paymentGroupId: string;
  orderCount: number;
  amount: number;
  clientKey?: string;
  isTestMode?: boolean;
}

export interface B2BConfirmPaymentResult {
  paymentId: string;
  paymentGroupId: string;
  status: string;
  paidAmount?: number;
  paymentMethod?: string;
  paidAt?: string;
}

/** 결제 세션 준비 — group total 1회 결제용 clientKey 수신 */
export async function prepareB2BPayment(params: {
  paymentGroupId: string;
  successUrl: string;
  failUrl: string;
}): Promise<B2BPreparePaymentResult> {
  const res = await api.post('/neture/b2b/payments/prepare', {
    paymentGroupId: params.paymentGroupId,
    successUrl: params.successUrl,
    failUrl: params.failUrl,
  });
  const body = res.data;
  if (!body?.success) {
    throw new Error(body?.error?.message || '결제 준비에 실패했습니다.');
  }
  return body.data as B2BPreparePaymentResult;
}

/** 결제 승인 — group 내 checkout_order N건 paid 전이 + 공급자별 bridge(backend) */
export async function confirmB2BPayment(params: {
  paymentId: string;
  paymentKey: string;
  paymentGroupId: string;
}): Promise<B2BConfirmPaymentResult> {
  const res = await api.post('/neture/b2b/payments/confirm', {
    paymentId: params.paymentId,
    paymentKey: params.paymentKey,
    paymentGroupId: params.paymentGroupId,
  });
  const body = res.data;
  if (!body?.success) {
    throw new Error(body?.error?.message || '결제 확인에 실패했습니다.');
  }
  return body.data as B2BConfirmPaymentResult;
}

/**
 * Toss v1 결제 SDK 로더 (CDN 스크립트 주입 — npm dependency 추가 없이 lockfile 무변경).
 * window.TossPayments(clientKey) 는 npm @tosspayments/payment-sdk 의 loadTossPayments 와 동일 API.
 */
export async function loadTossWidget(clientKey: string): Promise<any> {
  const w = window as any;
  if (!w.TossPayments) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-toss-sdk="v1"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Toss SDK 로드 실패')));
        if (w.TossPayments) resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://js.tosspayments.com/v1/payment';
      s.async = true;
      s.dataset.tossSdk = 'v1';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Toss SDK 로드 실패'));
      document.head.appendChild(s);
    });
  }
  if (!w.TossPayments) throw new Error('Toss SDK 를 사용할 수 없습니다.');
  return w.TossPayments(clientKey);
}
