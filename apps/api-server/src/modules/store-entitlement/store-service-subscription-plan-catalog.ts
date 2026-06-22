/**
 * Store Service Subscription Plan Catalog
 * WO-O4O-STORE-SERVICE-SUBSCRIPTION-PLAN-CATALOG-V1
 *
 * 매장 부가서비스 구독(STORE_SERVICE_SUBSCRIPTION)의 가격·기간·표시명 SSOT.
 * V1 은 DB 테이블 없이 서버 fixed catalog(상수 + 타입)로 관리한다.
 *   - plan 이 FOREIGN_VISITOR_SALES_SUPPORT 1개뿐이고, 가격 운영 정책이 아직 가변적이며,
 *     migration 없이 안정화 가능하기 때문. 운영 가격 관리가 필요해지면 PLAN-CATALOG-DB-V2 로 확장.
 * 가격 산정 책임은 전적으로 서버(prepare)에 있다. client amount 는 신뢰하지 않는다.
 *
 * 선행: WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1
 */
import { type StorePaidFeaturePlanCode } from './store-paid-feature-entitlement.entity.js';

export const STORE_SERVICE_SUBSCRIPTION_PAYMENT_TYPE = 'STORE_SERVICE_SUBSCRIPTION' as const;

export interface StoreServiceSubscriptionPlan {
  planCode: StorePaidFeaturePlanCode;
  paymentType: typeof STORE_SERVICE_SUBSCRIPTION_PAYMENT_TYPE;
  /** 결제창/화면 표시명 */
  name: string;
  /** 결제 금액(원). 서버 prepare 가 이 값으로 결제 세션을 만든다. */
  amount: number;
  currency: 'KRW';
  /** 이용권 부여/연장 일수. confirm 이 이 값으로 entitlement 를 생성/연장한다. */
  durationDays: number;
  /** 가격 출처. V1 은 고정 catalog. (DB화 시 'DB_CATALOG' 등으로 확장) */
  priceSource: 'V1_FIXED_CATALOG';
  /** 판매 활성 여부. false 면 구독 불가. */
  enabled: boolean;
}

/**
 * V1 fixed catalog. 가격(99000)은 V1 확정 정책값(placeholder 아님 — 운영 화면엔 확정가로 표시).
 * 가격 변경이 필요하면 이 catalog 만 수정한다(하드코딩 분산 금지).
 */
const STORE_SERVICE_SUBSCRIPTION_PLANS: Partial<
  Record<StorePaidFeaturePlanCode, StoreServiceSubscriptionPlan>
> = {
  FOREIGN_VISITOR_SALES_SUPPORT: {
    planCode: 'FOREIGN_VISITOR_SALES_SUPPORT',
    paymentType: STORE_SERVICE_SUBSCRIPTION_PAYMENT_TYPE,
    name: '외국인 여행객 판매지원 월 이용권',
    amount: 99000,
    currency: 'KRW',
    durationDays: 30,
    priceSource: 'V1_FIXED_CATALOG',
    enabled: true,
  },
};

/** planCode 의 plan 정의 조회. 미정의 시 null. */
export function getStoreServiceSubscriptionPlan(
  planCode: string,
): StoreServiceSubscriptionPlan | null {
  return STORE_SERVICE_SUBSCRIPTION_PLANS[planCode as StorePaidFeaturePlanCode] ?? null;
}

/** 판매 활성(enabled) plan 목록. */
export function listStoreServiceSubscriptionPlans(): StoreServiceSubscriptionPlan[] {
  return Object.values(STORE_SERVICE_SUBSCRIPTION_PLANS).filter(
    (p): p is StoreServiceSubscriptionPlan => !!p && p.enabled,
  );
}

/**
 * 구매 가능한 plan 인지 단언. enabled plan 이면 { plan }, 아니면 { error }.
 *   - 미정의 planCode → PLAN_NOT_PURCHASABLE
 *   - enabled=false → PLAN_DISABLED
 *   - amount<=0 → PLAN_PRICE_UNDEFINED
 */
export function assertEnabledPlan(
  planCode: string,
):
  | { plan: StoreServiceSubscriptionPlan }
  | { error: { status: number; code: string; message: string } } {
  const plan = getStoreServiceSubscriptionPlan(planCode);
  if (!plan) {
    return { error: { status: 400, code: 'PLAN_NOT_PURCHASABLE', message: `구독 불가 planCode: ${planCode}` } };
  }
  if (!plan.enabled) {
    return { error: { status: 400, code: 'PLAN_DISABLED', message: `현재 판매하지 않는 plan: ${planCode}` } };
  }
  if (!plan.amount || plan.amount <= 0) {
    return { error: { status: 400, code: 'PLAN_PRICE_UNDEFINED', message: `가격 미정의 planCode: ${planCode}` } };
  }
  return { plan };
}
