/**
 * HubB2BPage — K-Cosmetics Store HUB 상품 카탈로그 (thin wrapper)
 *
 * WO-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1:
 *   GlycoPharm/K-Cosmetics near-identical B2B 카탈로그를 @o4o/store-ui-core `B2BCatalogHub` 로 통합.
 *   본 파일은 K-Cosmetics api client + accent(pink) + tableId + 라벨만 주입하는 wrapper.
 *
 * 선행:
 *   WO-O4O-HUB-TO-STORE-UX-BRIDGE-V1,
 *   WO-O4O-KCOS-STORE-HUB-B2B-CATALOG-KPA-ALIGNMENT-V1
 *     (유통유형 탭 + DataTable + multi-select + ActionBar 정렬 — 공통 컴포넌트에 그대로 보존).
 *
 *   "내 매장에 추가" = 공급 상품 신청(ProductApproval PENDING). 신청 ≠ 주문.
 */

import { B2BCatalogHub } from '@o4o/store-ui-core';
import {
  getCatalog,
  applyBySupplyProductId,
  cancelProductByOfferId,
  type CatalogProduct,
} from '../../api/pharmacyProducts';

export function HubB2BPage() {
  return (
    <B2BCatalogHub<CatalogProduct>
      accent="pink"
      tableId="kcos-store-hub-b2b-products"
      labels={{ supplierLabel: '공급사' }}
      api={{ getCatalog, applyBySupplyProductId, cancelProductByOfferId }}
    />
  );
}

export default HubB2BPage;
