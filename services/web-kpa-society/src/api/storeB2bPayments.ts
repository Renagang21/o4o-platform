/**
 * KPA 매장 → 공급자 B2B 결제 API client
 *
 * WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1 §2-E-4
 *
 * backend: `/api/v1/kpa/b2b/payments/{prepare,confirm,order/:orderId}`
 *   (공통 factory `services/payment/b2b/b2b-payment-controller.factory.ts` · sourceService='store-b2b')
 *
 * 대상: 승인축 B2B 주문(`store_b2b_cart`) · **Event Offer 특가 주문**(`store_cart_checkout`).
 *   Event Offer 는 "특가 판매" 일 뿐이므로 **전용 결제 UX 를 만들지 않고** 이 경로를 그대로 쓴다.
 *
 * ⚠️ 소비자 → 매장 판매 결제(`/api/v1/kpa/payments/*`)는 은퇴(410)다. 그 경로를 되살리지 않는다.
 *    이 client 는 **매장이 구매자인 B2B 축** 전용이다.
 *
 * payment-first: 결제 완료 전에는 공급자에게 주문이 전달되지 않는다(후불·인보이스 없음).
 */
import { apiClient } from './client';

export interface StoreB2bPreparePaymentResult {
  paymentId: string;
  transactionId?: string;
  /** 단일 주문 결제 시 */
  orderId?: string;
  orderNumber?: string;
  /** 다중 공급자 묶음 결제 시 */
  paymentGroupId?: string;
  orderCount?: number;
  amount: number;
  clientKey?: string;
  isTestMode?: boolean;
}

export interface StoreB2bConfirmPaymentResult {
  paymentId: string;
  orderId?: string;
  orderNumber?: string;
  paymentGroupId?: string;
  status: string;
  paidAmount?: number;
  paymentMethod?: string;
  paidAt?: string;
}

export interface StoreB2bPaymentInfo {
  orderId: string;
  orderNumber: string;
  orderName: string;
  amount: number;
  currency: string;
  clientKey: string;
}

type ApiEnvelope<T> = { success: boolean; data: T; error?: { code?: string; message?: string } };

function unwrap<T>(body: ApiEnvelope<T>, fallback: string): T {
  if (!body?.success) throw new Error(body?.error?.message || fallback);
  return body.data;
}

/** 결제 세션 준비. orderId 또는 paymentGroupId 중 하나를 넘긴다. */
export async function prepareStoreB2bPayment(params: {
  orderId?: string;
  paymentGroupId?: string;
  successUrl: string;
  failUrl: string;
}): Promise<StoreB2bPreparePaymentResult> {
  const body = await apiClient.post<ApiEnvelope<StoreB2bPreparePaymentResult>>('/b2b/payments/prepare', {
    ...(params.orderId ? { orderId: params.orderId } : {}),
    ...(params.paymentGroupId ? { paymentGroupId: params.paymentGroupId } : {}),
    successUrl: params.successUrl,
    failUrl: params.failUrl,
  });
  return unwrap(body, '결제 준비에 실패했습니다.');
}

/**
 * 결제 승인. 성공하면 backend 가
 *   payment.completed → checkout_order paid → FulfillmentBridge → 공급자 주문 노출
 * 까지 이어준다.
 */
export async function confirmStoreB2bPayment(params: {
  paymentId: string;
  paymentKey: string;
  orderId?: string;
  paymentGroupId?: string;
}): Promise<StoreB2bConfirmPaymentResult> {
  const body = await apiClient.post<ApiEnvelope<StoreB2bConfirmPaymentResult>>('/b2b/payments/confirm', {
    paymentId: params.paymentId,
    paymentKey: params.paymentKey,
    ...(params.orderId ? { orderId: params.orderId } : {}),
    ...(params.paymentGroupId ? { paymentGroupId: params.paymentGroupId } : {}),
  });
  return unwrap(body, '결제 확인에 실패했습니다.');
}

/** 결제창 렌더링용 주문 정보 */
export async function getStoreB2bPaymentInfo(orderId: string): Promise<StoreB2bPaymentInfo> {
  const body = await apiClient.get<ApiEnvelope<StoreB2bPaymentInfo>>(`/b2b/payments/order/${orderId}`);
  return unwrap(body, '결제 정보를 불러오지 못했습니다.');
}

/**
 * Toss v1 결제 SDK 로더 (CDN 스크립트 주입 — npm dependency/lockfile 무변경).
 * web-neture `netureB2bPayments.ts` 와 같은 방식이다(새 공통 위젯 패키지를 만들지 않는다).
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

/**
 * 결제 개시 헬퍼 — prepare → Toss 결제창.
 * 성공 시 successUrl 로 리다이렉트되고, 그 화면에서 `confirmStoreB2bPayment` 를 호출한다.
 */
export async function startStoreB2bPayment(params: {
  orderId?: string;
  paymentGroupId?: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
  customerName?: string;
}): Promise<void> {
  const prepared = await prepareStoreB2bPayment({
    orderId: params.orderId,
    paymentGroupId: params.paymentGroupId,
    successUrl: params.successUrl,
    failUrl: params.failUrl,
  });
  const clientKey = prepared.clientKey;
  if (!clientKey) throw new Error('결제 설정을 불러오지 못했습니다.');

  const toss = await loadTossWidget(clientKey);
  // PG orderId 슬롯: group 결제면 paymentGroupId, 단일이면 checkout order id
  const pgOrderId = params.paymentGroupId ?? params.orderId;
  await toss.requestPayment('카드', {
    amount: prepared.amount,
    orderId: pgOrderId,
    orderName: params.orderName,
    successUrl: params.successUrl,
    failUrl: params.failUrl,
    ...(params.customerName ? { customerName: params.customerName } : {}),
  });
}
