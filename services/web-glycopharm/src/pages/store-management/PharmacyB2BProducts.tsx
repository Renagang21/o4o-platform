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
 *   레거시 약국 자체 상품(glycopharm_products / pharmacyApi.getProducts)은 admin·b2b-order·
 *   storefront·파트너 모집이 계속 소비하므로 본 전환에서 제거하지 않는다.
 */

import { SupplyCatalogHub } from '@o4o/store-ui-core';
import {
  getCatalog,
  applyBySupplyProductId,
  cancelProductByOfferId,
  type CatalogProduct,
} from '../../api/pharmacyProducts';

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
    />
  );
}
