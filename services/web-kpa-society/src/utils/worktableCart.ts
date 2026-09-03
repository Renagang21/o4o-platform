/**
 * 관심상품 작업대 → canonical Store Cart 연결 helper (KPA-Society)
 *
 * WO-O4O-KPA-INTEREST-PRODUCT-WORKTABLE-TO-CANONICAL-CART-ADOPTION-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 관심상품 ≠ 주문상품
 *
 *   작업대 목록의 권위는 `GET /pharmacy/products/catalog` 의 `isAdded`(= 내 매장이
 *   신청했거나 진열 중인 offer)다. 그건 "관심"이지 "주문 가능"이 아니다.
 *   주문 가능 판정의 권위는 **서버**(`GET /pharmacy/products/orderable`)다 —
 *   그 쿼리가 offer 활성 · 공급자 ACTIVE · `offer_service_approvals` 승인 ·
 *   이벤트/판매자모집 축 분리를 이미 수행한다. 이 파일은 그 결과를 **읽기만** 하고
 *   자체 판정을 새로 만들지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 경계 (heuristic 금지)
 *
 *   · 카탈로그 행의 `id` 는 **SupplierProductOffer id**(`supplier_product_offers.id`)다.
 *     catalog SSOT 가 `spo.id AS "id"` 를 반환한다. master_id 를 넣지 않는다.
 *   · 관심상품 ↔ 주문가능 대응은 **offerId 동등 비교**로만 한다.
 *     상품명 · SKU · barcode · 제조사 문자열 매칭을 쓰지 않는다.
 *   · `supplierId` 는 `neture_suppliers.id` 이며 표시명(supplierName)을 식별자로 쓰지 않는다.
 *   · `priceSnapshot` 은 **표시용**이다. 주문 확정 시 서버가
 *     `offer_service_prices[kpa-society]` → `price_general` 순으로 재확정한다.
 *   · `organizationId` 는 보내지 않는다 — 매장(조직) 판정 권위는 서버다
 *     (`StoreB2BCartCheckoutService.organizationPolicy = 'required'`).
 */
import type { AddCartItemInput } from '../api/storeCart';
import type { OrderableProduct, OrderableSourceType } from '../api/pharmacyProducts';

/**
 * canonical B2B 장바구니(`sourceType='b2b'`)로 담을 수 있는 공급유형.
 *
 *   b2b       : PUBLIC/PRIVATE 공급자 offer
 *   operator  : SERVICE offer + 현재 서비스 운영자 승인(offer_service_approvals)
 *
 * 제외:
 *   event_offer        — 기존 이벤트오퍼 주문 흐름(`checkout-confirm`)을 그대로 둔다.
 *                        regular/b2b 축과 합치지 않는다.
 *   seller_recruitment — 취급 신청/공급 승인 전 상태이며 주문 경로가 아니다.
 */
export const WORKTABLE_CART_SOURCE_TYPES: readonly OrderableSourceType[] = ['b2b', 'operator'];

const CART_SOURCE_SET = new Set<string>(WORKTABLE_CART_SOURCE_TYPES);

/** 작업대 한 행이 주문 가능한지에 대한 판정 결과 코드 */
export type WorktableOrderability =
  /** 서버가 주문 가능으로 확인한 B2B/운영자 승인 offer */
  | 'ORDERABLE'
  /** 서버 주문가능 목록에 없음 — 승인 없음 / offer 비활성 / 공급자 중단 / 진열 없음 */
  | 'NOT_ORDERABLE'
  /** 이벤트오퍼 축 — 이 작업대가 아니라 이벤트 상품 화면에서 주문한다 */
  | 'EVENT_OFFER_AXIS'
  /** 판매자 모집 축 — 주문 경로가 아니다 */
  | 'RECRUITMENT_AXIS';

/** 사용자에게 보여줄 사유 문구 (내부 상태를 세분화해 노출하지 않는다) */
export const ORDERABILITY_LABEL: Record<WorktableOrderability, string> = {
  ORDERABLE: '주문 가능',
  NOT_ORDERABLE: '주문 불가',
  EVENT_OFFER_AXIS: '이벤트 상품',
  RECRUITMENT_AXIS: '모집 상품',
};

export const ORDERABILITY_HINT: Record<WorktableOrderability, string> = {
  ORDERABLE: '장바구니에 담을 수 있습니다.',
  NOT_ORDERABLE: '공급 승인 또는 공급 상태를 확인해 주세요.',
  EVENT_OFFER_AXIS: '이벤트 상품은 이벤트 화면에서 주문합니다.',
  RECRUITMENT_AXIS: '판매자 모집 상품은 주문 대상이 아닙니다.',
};

/**
 * 서버 주문가능 목록(offerId 축) 색인.
 *
 * `offerId` 가 없는 행(비정상 진열)은 대응시킬 canonical 식별자가 없으므로 버린다 —
 * 이름으로 보정하지 않는다.
 */
export function buildOrderableIndex(
  rows: readonly OrderableProduct[],
): Map<string, OrderableProduct> {
  const index = new Map<string, OrderableProduct>();
  for (const row of rows) {
    if (!row.offerId) continue;
    const existing = index.get(row.offerId);
    // 같은 offer 가 여러 진열로 나올 수 있다. 주문 가능 축(b2b/operator)을 우선 채택한다.
    if (existing && CART_SOURCE_SET.has(existing.sourceType)) continue;
    index.set(row.offerId, row);
  }
  return index;
}

/** 관심상품 1행의 주문 가능 여부 — 서버 목록 조회 결과만 근거로 삼는다. */
export function resolveOrderability(
  offerId: string,
  index: ReadonlyMap<string, OrderableProduct>,
): WorktableOrderability {
  const row = index.get(offerId);
  if (!row) return 'NOT_ORDERABLE';
  if (row.sourceType === 'event_offer') return 'EVENT_OFFER_AXIS';
  if (row.sourceType === 'seller_recruitment') return 'RECRUITMENT_AXIS';
  return CART_SOURCE_SET.has(row.sourceType) ? 'ORDERABLE' : 'NOT_ORDERABLE';
}

/** 장바구니 담기 payload 를 만들 수 있는 최소 행 (작업대 행 / 카탈로그 행 공통) */
export interface WorktableCartSource {
  /** supplier_product_offers.id — 카탈로그 SSOT 가 반환한 offer id */
  id: string;
  productName: string;
  supplierId: string | null;
  /** 표시용 기준가. null 이어도 서버가 canonical 가격을 재확정한다. */
  basePrice: number | null;
}

/** 담기 가능한 수량인가 — 서버 계약(양의 정수)과 같은 기준 */
export function isValidCartQuantity(quantity: unknown): quantity is number {
  return typeof quantity === 'number' && Number.isInteger(quantity) && quantity > 0;
}

/**
 * 작업대 행 → canonical `store_cart_items` 담기 payload.
 *
 * 담기는 주문이 아니다. 가격·재고·공급 노출은 주문 확정 시 서버가 다시 본다.
 */
export function buildWorktableCartPayload(
  product: WorktableCartSource,
  quantity: number,
): AddCartItemInput {
  if (!isValidCartQuantity(quantity)) {
    throw new Error(`invalid quantity: ${quantity}`);
  }
  return {
    sourceType: 'b2b',
    supplierProductOfferId: product.id,
    supplierId: product.supplierId ?? null,
    productName: product.productName,
    quantity,
    pricingSource: 'regular',
    // 표시용 스냅샷. 0 이어도 서버가 canonical 가격을 재확정한다.
    priceSnapshot: product.basePrice ?? 0,
  };
}
