/**
 * OfferExposureStrategy — B2B 주문 확정에서 "이 서비스에 이 offer 가 공급되는가" 판정
 *
 * WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 strategy 인가
 *
 *   B2B 주문 확정(`store_cart_items` → `checkout_orders`)의 나머지는 서비스에 무관하다.
 *   실제로 다른 것은 **공급 노출 정책 하나**뿐이다. 그래서 confirm 을 service-agnostic Core
 *   로 올리고, 이 축만 명시적 strategy 로 남긴다. flag 하나로 뭉개면 두 계약이 서로를
 *   가리므로 strategy 로 분리한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 3종 (현재 canonical 분류 그대로 — 새 정책을 만들지 않는다)
 *
 *   approval  : glycopharm / kpa-society / k-cosmetics
 *               `offer_service_approvals` 에 해당 serviceKey 승인(APPROVED) 행이 있어야 한다.
 *               `service_keys` opt-in 만으로 우회할 수 없다.
 *   optin     : pharmacy-hub
 *               공급자가 직접 켠 축 — `serviceKey = ANY(spo.service_keys)`. 운영자 승인 게이트 없음.
 *   neture    : neture
 *               Neture 원본 공급 정책 — approval_status / distribution_type / allowed_seller_ids.
 *               서비스 노출 junction 을 쓰지 않는다(공급자 자신의 홈 서비스).
 *
 * 두 SSOT(`APPROVAL_ELIGIBLE_SERVICE_KEYS` · `SUPPLIER_OPTIN_SERVICE_KEYS`)의 상호 배타
 * 계약은 이 파일 로드 시점에 fail-fast 로 강제한다 — 한 키가 두 축에 동시에 들어가면
 * 승인 게이트가 조용히 우회된다.
 */

import { SERVICE_KEYS } from '../../constants/service-keys.js';
import {
  APPROVAL_ELIGIBLE_SERVICE_KEYS,
  isApprovalEligibleServiceKey,
} from '../../modules/neture/constants/approval-service-keys.js';
import {
  SUPPLIER_OPTIN_SERVICE_KEYS,
  isSupplierOptinServiceKey,
} from '../../modules/neture/constants/supplier-optin-services.js';

/** 두 공급 축이 겹치면 승인 게이트가 조용히 무력화된다 — 부팅 시점에 막는다. */
(function assertMutuallyExclusiveSupplyAxes(): void {
  const optin = new Set<string>(SUPPLIER_OPTIN_SERVICE_KEYS);
  const overlap = APPROVAL_ELIGIBLE_SERVICE_KEYS.filter((k) => optin.has(k));
  if (overlap.length > 0) {
    throw new Error(
      `[OfferExposureStrategy] 승인 축과 opt-in 축에 동시에 속한 serviceKey 가 있습니다: ${overlap.join(', ')}. ` +
        '두 목록은 상호 배타여야 한다(승인 게이트 우회 방지).',
    );
  }
})();

export type OfferExposureStrategyKey = 'approval' | 'optin' | 'neture';

/** 공급 노출 판정에 쓰이는 offer 행 (Core 의 공통 SELECT 결과) */
export interface ExposureOfferRow {
  id: string;
  supplier_id: string;
  price_general: number;
  service_unit_price: number | null;
  is_active: boolean;
  approval_status: string;
  distribution_type: string;
  allowed_seller_ids: string[] | null;
  track_inventory: boolean;
  stock_quantity: number;
  reserved_quantity: number;
  product_name: string;
  master_id: string;
  master_status: string | null;
  supplier_status: string;
  base_shipping_fee: number | null;
  free_shipping_threshold: number | null;
}

/** strategy gate 가 거부할 때 돌려주는 실패 (code/문구는 서비스 계약 그대로) */
export interface ExposureGateFailure {
  code: string;
  reason: string;
}

export interface ExposureGateContext {
  buyerId: string;
  serviceKey: string;
  /** cart item 이 들고 있는 매장 조직 (Core 가 서버 검증한 값) */
  organizationId: string | null;
}

export interface OfferExposureStrategy {
  readonly key: OfferExposureStrategyKey;
  /**
   * offer enrich 쿼리에 추가되는 WHERE 절.
   * `$1` = offerIds(text[]), `$2` = serviceKey. 파라미터 바인딩만 쓴다(문자열 결합 금지).
   *
   * **soft delete(`spo.deleted_at`)는 여기에 넣지 않는다.** 삭제된 offer 배제는 공급 노출 정책이
   * 아니라 3축 공통 불변식이며 `b2b-checkout-confirm.core.ts` 의 base 쿼리가 소유한다
   * (WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1 DF-6 — 축마다 복사하다 `neture` 에서 누락됐다).
   */
  readonly offerWhereSql: string;
  /** 행 단위 공급 노출 판정. 통과면 null. */
  gate(offer: ExposureOfferRow, ctx: ExposureGateContext): ExposureGateFailure | null;
}

/**
 * 운영자 승인 축.
 *
 * `offer_service_approvals` 의 승인 행이 노출 권위다. 프로덕션에 승인 행이 몇 건인지와
 * 무관하게 게이트를 완화하지 않는다 — 0건이면 "공급 승인/온보딩이 없다"는 사실이지
 * 게이트를 낮출 근거가 아니다.
 *
 * 표기 축 (WO-O4O-GLYCOPHARM-CANONICAL-B2B-CART-PRODUCER-UI-ADOPTION-V1 §19):
 *   `offer_service_approvals.approval_status` 는 **소문자** 도메인이다
 *   (entity default 'pending', backfill migration 'approved', 카탈로그 SSOT
 *   `buildServiceApprovalGateSql` 도 'approved').
 *   대문자 'APPROVED' 는 `supplier_product_offers.approval_status` 의 축이다.
 *   두 축을 섞으면 EXISTS 가 항상 거짓이 되어 승인축 서비스 전체의 B2B confirm 이
 *   조용히 0건이 된다 — 완화가 아니라 정합의 문제다.
 */
const approvalStrategy: OfferExposureStrategy = {
  key: 'approval',
  offerWhereSql: `
          AND EXISTS (
                SELECT 1 FROM offer_service_approvals osa
                 WHERE osa.offer_id = spo.id
                   AND osa.service_key = $2
                   -- 소문자 도메인이다 (윗 주석 참조). 대문자로 비교하지 않는다.
                   AND osa.approval_status = 'approved'
              )`,
  gate(offer, ctx) {
    if (offer.master_status !== 'ACTIVE') {
      return { code: 'MASTER_INACTIVE', reason: `이용할 수 없는 상품입니다: ${offer.product_name}` };
    }
    if (offer.distribution_type === 'PRIVATE') {
      if (!offer.allowed_seller_ids || !offer.allowed_seller_ids.includes(ctx.buyerId)) {
        return { code: 'DISTRIBUTION_DENIED', reason: `유통 접근 권한이 없습니다: ${offer.product_name}` };
      }
    }
    if (offer.distribution_type === 'SERVICE' && !ctx.organizationId) {
      return {
        code: 'DISTRIBUTION_DENIED',
        reason: `SERVICE 상품은 매장(조직) 컨텍스트가 필요합니다: ${offer.product_name}`,
      };
    }
    return null;
  },
};

/**
 * 공급자 직접 opt-in 축 (Pharmacy-Hub).
 *
 * 조회(`PharmacyHubStoreProductController` EXPOSURE_GATE_SQL)와 **같은 기준**으로 재검증한다 —
 * 조회에 보이면 담을 수 있고, 담을 수 있으면 주문 시점에 같은 기준으로 다시 본다.
 * `approval_status` 는 보지 않는다(승인 대상 3키 파생값이라 PENDING 이 정상).
 */
const optinStrategy: OfferExposureStrategy = {
  key: 'optin',
  offerWhereSql: `
          AND $2 = ANY(spo.service_keys)`,
  gate(offer) {
    if (offer.distribution_type === 'PRIVATE') {
      return { code: 'DISTRIBUTION_DENIED', reason: `구매할 수 없는 상품입니다: ${offer.product_name}` };
    }
    if (offer.master_status !== 'ACTIVE') {
      return { code: 'MASTER_INACTIVE', reason: `이용할 수 없는 상품입니다: ${offer.product_name}` };
    }
    return null;
  },
};

/**
 * Neture 원본 공급 정책.
 *
 * 서비스 노출 junction 을 쓰지 않는다 — 공급자가 자기 홈 서비스에서 파는 축이다.
 * 현행 조건(approval_status / distribution_type / allowed_seller_ids)을 **그대로** 보존한다.
 */
const netureStrategy: OfferExposureStrategy = {
  key: 'neture',
  offerWhereSql: '',
  gate(offer, ctx) {
    if (offer.approval_status !== 'APPROVED') {
      return { code: 'PRODUCT_NOT_APPROVED', reason: `미승인 상품입니다: ${offer.product_name}` };
    }
    if (offer.distribution_type === 'PRIVATE') {
      if (!offer.allowed_seller_ids || !offer.allowed_seller_ids.includes(ctx.buyerId)) {
        return { code: 'DISTRIBUTION_DENIED', reason: `유통 접근 권한이 없습니다: ${offer.product_name}` };
      }
    }
    if (offer.distribution_type === 'SERVICE' && !ctx.organizationId) {
      return {
        code: 'DISTRIBUTION_DENIED',
        reason: `SERVICE 상품은 매장(조직) 컨텍스트가 필요합니다: ${offer.product_name}`,
      };
    }
    return null;
  },
};

export const OFFER_EXPOSURE_STRATEGIES: Readonly<Record<OfferExposureStrategyKey, OfferExposureStrategy>> =
  Object.freeze({
    approval: approvalStrategy,
    optin: optinStrategy,
    neture: netureStrategy,
  });

/**
 * serviceKey → 공급 노출 strategy. 등록되지 않은 serviceKey 는 null (주문 확정 불가).
 *
 * 판정 순서가 곧 우선순위다. 승인 축을 먼저 본다 — 목록 실수로 두 축에 동시에 들어가도
 * 승인 게이트가 opt-in 으로 낮아지지 않는다(모듈 로드 시 fail-fast 와 이중 방어).
 */
export function resolveOfferExposureStrategy(serviceKey: string): OfferExposureStrategy | null {
  if (isApprovalEligibleServiceKey(serviceKey)) return approvalStrategy;
  if (isSupplierOptinServiceKey(serviceKey)) return optinStrategy;
  if (serviceKey === SERVICE_KEYS.NETURE) return netureStrategy;
  return null;
}
