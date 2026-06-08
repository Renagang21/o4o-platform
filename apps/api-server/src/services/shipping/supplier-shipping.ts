/**
 * Supplier Shipping Fee Calculation (WO-O4O-NETURE-SUPPLIER-SHIPPING-CALCULATION-V2)
 *
 * 공급자별 배송 정책(base_shipping_fee / free_shipping_threshold)을 주문 subtotal 에
 * 적용해 배송비를 계산하는 순수 함수. DB/엔티티 의존 없음 → core(checkout) 및
 * service(neture, event-offer) 어디서나 import 가능.
 *
 * Foundation: WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1
 *   - NetureSupplier.baseShippingFee (integer, nullable)
 *   - NetureSupplier.freeShippingThreshold (integer, nullable)
 *
 * Boundary IR: IR-O4O-NETURE-ORDER-TABLE-BOUNDARY-DESIGN-V1
 *   - 주문 테이블 병합 없이 두 createOrder 경로(checkout/neture)에 동일 정책 적용.
 *
 * Fallback 정책 (CHECK 확정): 공급자 정책 미설정 시 0원.
 *   - baseShippingFee 가 null/undefined 이면 배송비 0 (정책 없음 → 무료).
 *   - 기존 neture 고정식(>=5만 무료 / else 3000)은 제거. 공급자가 명시 설정해야 부과됨.
 */

export interface SupplierShippingPolicy {
  /** 공급자 기본 배송비 (원). null/undefined → 정책 없음 */
  baseShippingFee?: number | null;
  /** 무료배송 기준 금액 (원). null/undefined → 무료배송 기준 없음 */
  freeShippingThreshold?: number | null;
}

export interface SupplierShippingResult {
  /** 계산된 배송비 (원, 항상 >= 0) */
  shippingFee: number;
  /** 무료배송 기준 충족으로 0원 처리됨 */
  freeShippingApplied: boolean;
  /** 적용 근거 */
  policySource: 'supplier_policy' | 'fallback';
}

/**
 * 공급자 배송 정책 기준 배송비 계산.
 *
 * @param subtotal 공급자 단위 주문 상품 합계 (원)
 * @param policy   공급자 배송 정책 (null 가능)
 */
export function calculateSupplierShippingFee(
  subtotal: number,
  policy: SupplierShippingPolicy | null | undefined,
): SupplierShippingResult {
  const base = policy?.baseShippingFee;
  const threshold = policy?.freeShippingThreshold;

  // 정책 없음 (baseShippingFee 미설정) → fallback: 0원
  if (base == null) {
    return { shippingFee: 0, freeShippingApplied: false, policySource: 'fallback' };
  }

  const safeBase = Math.max(0, Math.trunc(base));

  // 상품 합계가 0 이하 → 배송비 없음
  if (!(subtotal > 0)) {
    return { shippingFee: 0, freeShippingApplied: false, policySource: 'supplier_policy' };
  }

  // 무료배송 기준 충족
  if (threshold != null && subtotal >= threshold) {
    return { shippingFee: 0, freeShippingApplied: true, policySource: 'supplier_policy' };
  }

  return { shippingFee: safeBase, freeShippingApplied: false, policySource: 'supplier_policy' };
}
