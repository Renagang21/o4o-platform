/**
 * PharmacyB2BProducts — GlycoPharm 내 약국 [약국 상품·거래] > 상품 (thin wrapper)
 *
 * WO-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-FRONTEND-ADAPTER-V1:
 *   내 약국 상품·거래의 "상품" 화면을 공급자 상품 카탈로그 기반으로 전환한다.
 *   신규 backend/DB 없이 공통 카탈로그 컴포넌트(@o4o/store-ui-core SupplyCatalogHub)와
 *   GlycoPharm 상품 API(pharmacyProducts: getCatalog/apply/cancel)를 재사용한다.
 *   (선행: IR-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-DATA-SOURCE-ALIGNMENT-V1 판정 A. READY)
 *
 * IA 구분:
 *   - 이 화면(/store/commerce/products, legacy /store/management/b2b redirect) = 내 약국 상품·거래 안에서 거래할 공급자 상품을 확인하는 업무 화면.
 *   - /store-hub/b2b(HubB2BCatalogPage) = Store HUB 에서 공급 상품을 탐색하는 허브 화면(유지, 무변경).
 *   동일 API/컴포넌트를 재사용하되 헤더 문구와 tableId 만 내 약국 맥락으로 분리한다.
 *
 *   "내 약국에 추가" = 공급 상품 신청(ProductApproval PENDING). 신청 ≠ 주문.
 *
 * WO-O4O-GLYCOPHARM-CANONICAL-B2B-CART-PRODUCER-UI-ADOPTION-V1:
 *   이 화면에 canonical B2B 장바구니 producer 를 연결한다. 새 주문 UI 를 만드는 것이 아니라
 *   이미 있는 공급 카탈로그를 이미 완성된 cart/confirm/order 축의 producer 로 잇는 것이다.
 *
 *     승인된 supplier_product_offers → store_cart_items(b2b)
 *       → /store-hub/cart → checkout-confirm-b2b → checkout_orders
 *
 *   담기 ≠ 신청 ≠ 주문. 담기는 주문을 만들지 않으며, 자격(승인·유통·조직)과 가격 권위는
 *   전부 서버에 있다. legacy `/store/b2b-order` 와 `glycopharm_products` 주문 경로는
 *   되살리지 않는다(은퇴 유지).
 *   레거시 약국 자체 상품(glycopharm_products / pharmacyApi.getProducts)은 admin·operator·
 *   storefront·파트너 모집이 계속 소비하므로 본 전환에서 제거하지 않는다.
 *   (WO-O4O-GLYCOPHARM-LEGACY-B2B-ORDER-PAGE-RETIREMENT-V1: b2b-order 는 소비처에서 빠졌다 —
 *    그 화면이 은퇴하고 거래 신청이 이 화면으로 일원화됐다. 나머지 소비처는 그대로 보호한다.)
 */

import { SupplyCatalogHub } from '@o4o/store-ui-core';
import {
  getCatalog,
  applyBySupplyProductId,
  cancelProductByOfferId,
  type CatalogProduct,
} from '../../api/pharmacyProducts';
import { storeCartApi } from '../../api/storeCart';
import { CART_SERVICE_KEY } from '../../utils/eventOfferCart';
import { buildSupplyCatalogCartPayload } from '../../utils/supplyCatalogCart';

/** 장바구니 화면 경로 (App.tsx 라우트와 동일). */
const STORE_CART_PATH = '/store-hub/cart';

export default function PharmacyB2BProducts() {
  return (
    <SupplyCatalogHub<CatalogProduct>
      accent="teal"
      tableId="glycopharm-store-commerce-products"
      labels={{ supplierLabel: '공급자' }}
      heading={{
        title: '상품 관리',
        description: '약국에서 거래할 공급자 상품을 확인하고 내 약국에 추가할 수 있습니다.',
      }}
      api={{ getCatalog, applyBySupplyProductId, cancelProductByOfferId }}
      cart={{
        cartHref: STORE_CART_PATH,
        addToCart: async (product) => {
          await storeCartApi.addItem(CART_SERVICE_KEY, buildSupplyCatalogCartPayload(product));
        },
      }}
    />
  );
}
