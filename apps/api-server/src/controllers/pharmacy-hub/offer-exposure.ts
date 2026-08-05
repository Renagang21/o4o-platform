/**
 * Pharmacy-Hub Offer 노출 게이트 SSOT
 *
 * WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1 §4.5 에서 정한 조건을
 * WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1 에서 상수로 추출했다.
 * 상품 목록(browse) · 상세 · **취급 등록(apply)** 이 같은 조건을 쓰게 하기 위함이다
 * ("비슷하지만 다른 SQL" 복사 금지 — 목록에 안 보이는 offer 를 ID 직접 지정으로
 *  취급 등록할 수 있는 구멍을 원천 차단한다).
 *
 * 별칭 계약 — 이 조각을 쓰는 쿼리는 아래 별칭을 제공해야 한다:
 *   spo = supplier_product_offers · ns = neture_suppliers · pm = product_masters
 * 파라미터 $1 = 'pharmacy-hub'
 *
 * 축의 의미: 다른 서비스는 offer_service_approvals(운영자 승인)를 게이트로 쓰지만,
 * Pharmacy-Hub 는 **공급자 직접 opt-in**(`spo.service_keys` 포함)이 그 축이다.
 * PRIVATE 은 allowed_seller_ids(매장 범위) 모델이며 Pharmacy-Hub 에 아직 그 축이
 * 없으므로 방어적으로 제외한다.
 */
export const PHARMACY_HUB_OFFER_EXPOSURE_GATE_SQL = `
        spo.deleted_at IS NULL
    AND spo.is_active = true
    AND spo.distribution_type <> 'PRIVATE'
    AND $1 = ANY(spo.service_keys)
    AND ns.status = 'ACTIVE'
    AND COALESCE(pm.status, 'ACTIVE') = 'ACTIVE'`;
