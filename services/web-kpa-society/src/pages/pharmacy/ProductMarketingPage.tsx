/**
 * ProductMarketingPage — 상품 마케팅 그래프 (KPA thin adapter)
 *
 * WO-O4O-PRODUCT-MARKETING-GRAPH-V1
 * WO-O4O-KPA-STORE-QR-PRODUCT-CONTEXT-CANONICAL-MERGE-V1
 * WO-O4O-KPA-STORE-SILENT-ERROR-UX-STANDARDIZATION-V1 (load-error 계약)
 * WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1 (POP canonical 진입)
 *
 * WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-A:
 *   KCos/GP 가 이미 쓰던 공통 ProductMarketingView(@o4o/store-ui-core)로 화면 본체를 이관.
 *   KPA 만 갖고 있던 load-error 계약(실패/빈 상태 분리·재조회 실패 시 기존 내용 유지·
 *   연결 해제 실패 안내)을 공통 View 로 올린 뒤 채택했다 — 화면·문구·동선 변경 없음.
 *
 * Route: /store/commerce/products/:productId/marketing
 * API: /pharmacy/products/:productId/marketing (변경 없음)
 */

import { ProductMarketingView } from '@o4o/store-ui-core';
import {
  getProductMarketing,
  unlinkProductMarketingAsset,
} from '../../api/productMarketing';

export function ProductMarketingPage() {
  return (
    <ProductMarketingView
      getProductMarketing={getProductMarketing}
      unlinkProductMarketingAsset={unlinkProductMarketingAsset}
    />
  );
}

export default ProductMarketingPage;
