/**
 * Supply Catalog → Store Cart payload helper (GlycoPharm)
 *
 * WO-O4O-GLYCOPHARM-CANONICAL-B2B-CART-PRODUCER-UI-ADOPTION-V1
 *
 * 승인된 공급 카탈로그 행(`supplier_product_offers`)을 canonical `store_cart_items` 의
 * B2B source 로 담기 위한 payload 만 조립한다.
 *
 * 경계:
 *   · 카탈로그 행의 `id` 는 **SupplierProductOffer id** 다(카탈로그 SSOT 가 `spo.id` 를 반환).
 *     master_id 나 legacy `glycopharm_products.id` 를 넣지 않는다.
 *   · `supplierId` 는 `neture_suppliers.id` 이며 표시명(supplierName)·manufacturer 문자열을
 *     공급자 식별자로 쓰지 않는다.
 *   · `priceSnapshot` 은 **표시용**이다. 주문 확정 시 서버가
 *     `offer_service_prices[glycopharm]` → `price_general` 순으로 재확정한다.
 *   · `organizationId` 는 보내지 않는다 — 매장(조직) 판정 권위는 서버다.
 */
import type { AddCartItemInput } from '../api/storeCart';
import type { CatalogProduct } from '../api/pharmacyProducts';

export function buildSupplyCatalogCartPayload(
  product: CatalogProduct,
  quantity = 1,
): AddCartItemInput {
  return {
    sourceType: 'b2b',
    supplierProductOfferId: product.id,
    supplierId: product.supplierId ?? null,
    productName: product.name,
    quantity,
    pricingSource: 'regular',
    // 표시용 스냅샷. 0 이어도 서버가 canonical 가격을 재확정한다.
    priceSnapshot: product.priceGold ?? product.priceGeneral ?? 0,
  };
}
