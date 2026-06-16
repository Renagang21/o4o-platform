/**
 * StoreCommerceProductsPage — K-Cosmetics 내 매장 [매장 상품·거래] > 상품 (thin wrapper)
 *
 * WO-O4O-KCOSMETICS-STORE-COMMERCE-PRODUCT-PAGE-INTRODUCE-V1:
 *   내 매장 상품·거래 영역에 "상품" 화면을 1차 도입한다. 신규 backend/DB 없이
 *   기존 공통 카탈로그 컴포넌트(@o4o/store-ui-core SupplyCatalogHub)와
 *   K-Cosmetics 상품 API(pharmacyProducts: getCatalog/apply/cancel)를 재사용한다.
 *
 * IA 구분:
 *   - 이 화면(/store/commerce/products) = 내 매장 상품·거래 안에서 거래 상품을 확인하는 업무 화면.
 *   - /store-hub/b2b(HubB2BPage) = Store HUB 에서 공급 상품을 탐색·신청하는 화면(유지, 무변경).
 *   동일 API/컴포넌트를 재사용하되 헤더 문구만 내 매장 맥락으로 주입한다.
 *
 *   "내 매장에 추가" = 공급 상품 신청(ProductApproval PENDING). 신청 ≠ 주문.
 */

import { SupplyCatalogHub } from '@o4o/store-ui-core';
import {
  getCatalog,
  applyBySupplyProductId,
  cancelProductByOfferId,
  type CatalogProduct,
} from '../../api/pharmacyProducts';

export function StoreCommerceProductsPage() {
  return (
    <SupplyCatalogHub<CatalogProduct>
      accent="pink"
      tableId="kcos-store-commerce-products"
      labels={{ supplierLabel: '공급사' }}
      heading={{
        title: '상품 관리',
        description: '매장에서 거래할 상품을 확인하고 내 매장에 추가할 수 있습니다.',
      }}
      api={{ getCatalog, applyBySupplyProductId, cancelProductByOfferId }}
    />
  );
}

export default StoreCommerceProductsPage;
