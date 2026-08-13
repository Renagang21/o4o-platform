/**
 * ProductMarketingPage — K-Cosmetics 상품 마케팅 자산 그래프
 *
 * WO-O4O-PRODUCT-MARKETING-POP-BUILDER-EXTRACTION-V1
 * WO-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1:
 *   화면 본체를 @o4o/store-ui-core 의 ProductMarketingView 로 이관.
 *
 * API: /api/v1/cosmetics/pharmacy/products/:productId/marketing (변경 없음)
 */

import { ProductMarketingView } from '@o4o/store-ui-core';
import {
  getProductMarketing,
  unlinkProductMarketingAsset,
} from '@/api/productMarketing';

export function ProductMarketingPage() {
  return (
    <ProductMarketingView
      getProductMarketing={getProductMarketing}
      unlinkProductMarketingAsset={unlinkProductMarketingAsset}
    />
  );
}
