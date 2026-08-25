/**
 * Pharmacy-Hub 매장 부가서비스 이용권(구독) 결제 API 클라이언트
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#79)
 *
 * backend = 공통 /api/v1/store-entitlements/subscriptions/{plans,prepare,confirm} 와 /me/check
 * (WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1). 가격·기간·표시명은 서버 plan catalog SSOT 이며
 * 프런트가 하드코딩하지 않는다. 이것은 매장→소비자 판매 결제(O4O-STORE-COMMERCE-BOUNDARY-V1 이 금지)가
 * 아니라 **매장이 플랫폼에 지불하는 이용권** 이라 경계 위반이 아니다.
 */
import { api } from '../apiClient';

export interface SubscriptionPlan {
  planCode: string;
  name: string;
  amount: number;
  currency: string;
  durationDays: number;
  enabled?: boolean;
}

export interface SubscriptionPrepareResult {
  paymentId: string;
  transactionId?: string;
  orderId: string;
  amount: number;
  currency?: string;
  clientKey?: string;
  isTestMode?: boolean;
  plan?: {
    planCode: string;
    name: string;
    durationDays: number;
    amount: number;
    currency: string;
  };
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

const BASE = '/store-entitlements';

/** plan catalog 단건 — 화면 가격 표시용(서버 SSOT). */
export async function getSubscriptionPlan(planCode: string): Promise<SubscriptionPlan> {
  const res = await api.get(`${BASE}/subscriptions/plans/${encodeURIComponent(planCode)}`);
  if (!res.data?.success || !res.data?.data) {
    throw new Error(res.data?.error || 'plan 정보를 불러오지 못했습니다.');
  }
  return res.data.data as SubscriptionPlan;
}

/** 결제 세션 준비 — 금액/orderId 는 서버가 산정한다. */
export async function prepareSubscription(params: {
  serviceKey: string;
  planCode: string;
  successUrl: string;
  failUrl: string;
}): Promise<SubscriptionPrepareResult> {
  const res = await api.post(`${BASE}/subscriptions/prepare`, params);
  if (!res.data?.success || !res.data?.data) {
    throw new Error(res.data?.error || '결제 준비에 실패했습니다.');
  }
  return res.data.data as SubscriptionPrepareResult;
}

/** 결제 승인 — 성공 시 이용권 ACTIVE 생성/연장. */
export async function confirmSubscription(params: {
  paymentId: string;
  paymentKey: string;
  orderId: string;
  serviceKey: string;
}): Promise<SubscriptionConfirmResult> {
  const res = await api.post(`${BASE}/subscriptions/confirm`, params);
  if (!res.data?.success || !res.data?.data) {
    throw new Error(res.data?.error || '결제 승인에 실패했습니다.');
  }
  return res.data.data as SubscriptionConfirmResult;
}

/** 내 매장의 이용권 활성 여부(self-scoped). */
export async function checkSubscription(params: {
  serviceKey: string;
  planCode: string;
}): Promise<SubscriptionCheckResult> {
  const res = await api.get(`${BASE}/me/check`, { params });
  return { active: res.data?.data?.active === true, endsAt: res.data?.data?.endsAt ?? null };
}
