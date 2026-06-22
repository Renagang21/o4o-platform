/**
 * Store Service Subscription 결제 API 클라이언트 (KPA-Society 매장 측)
 * WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1 (Phase 2 frontend)
 *
 * 매장 경영자가 부가서비스(FOREIGN_VISITOR_SALES_SUPPORT)를 Toss 로 1회 결제(30일 이용권)한다.
 * backend: /api/v1/store-entitlements/subscriptions/{prepare,confirm} (sourceService='store-service-subscription').
 * 소비자→매장 checkout(STORE_SALE_PAYMENT) 과 분리된 전용 흐름이다.
 *
 * coreApiClient 사용 — /store-entitlements 는 /api/v1 (kpa 네임스페이스 밖).
 */
import { coreApiClient } from './client';

export interface SubscriptionPrepareResult {
  paymentId: string;
  transactionId?: string;
  orderId: string;
  amount: number;
  clientKey?: string;
  isTestMode?: boolean;
}

export interface SubscriptionConfirmResult {
  serviceKey: string;
  planCode: string;
  status: string;
  startsAt?: string | null;
  endsAt?: string | null;
  applied: boolean;
}

export interface SubscriptionCheckResult {
  active: boolean;
  endsAt?: string | null;
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/** 구독 결제 세션 준비 — 서버가 금액/orderId 를 산정하고 clientKey 를 반환한다. */
export async function prepareSubscription(params: {
  serviceKey: string;
  planCode: string;
  successUrl: string;
  failUrl: string;
}): Promise<SubscriptionPrepareResult> {
  const body = await coreApiClient.post<Envelope<SubscriptionPrepareResult>>(
    '/store-entitlements/subscriptions/prepare',
    params,
  );
  if (!body?.success || !body.data) {
    throw new Error(body?.error || '결제 준비에 실패했습니다.');
  }
  return body.data;
}

/** 구독 결제 승인 — 성공 시 이용권 ACTIVE 생성/30일 연장. */
export async function confirmSubscription(params: {
  paymentId: string;
  paymentKey: string;
  orderId: string;
  serviceKey: string;
}): Promise<SubscriptionConfirmResult> {
  const body = await coreApiClient.post<Envelope<SubscriptionConfirmResult>>(
    '/store-entitlements/subscriptions/confirm',
    params,
  );
  if (!body?.success || !body.data) {
    throw new Error(body?.error || '결제 승인에 실패했습니다.');
  }
  return body.data;
}

/** 현재 이용권 활성 여부 조회(결제 후 재확인용). */
export async function checkSubscription(params: {
  serviceKey: string;
  planCode: string;
}): Promise<SubscriptionCheckResult> {
  const body = await coreApiClient.get<Envelope<{ active?: boolean; endsAt?: string | null }>>(
    '/store-entitlements/me/check',
    params,
  );
  return { active: body?.data?.active === true, endsAt: body?.data?.endsAt ?? null };
}

/**
 * Toss v1 결제 SDK 로더 (CDN 스크립트 주입 — npm dependency 추가 없이 lockfile 무변경).
 * window.TossPayments(clientKey) 는 @tosspayments/payment-sdk 의 loadTossPayments 와 동일 API.
 */
export async function loadTossSdk(clientKey: string): Promise<any> {
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
