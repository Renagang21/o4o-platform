/**
 * ProductPopBuilderPage — legacy compatibility route (은퇴)
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1 (판정 B-3)
 *
 * 과거 동작(제거됨):
 *   `/store/commerce/products/:productId/pop` 의 :productId 는 실제로는
 *   store_local_products.id(매장 자체 상품)인데, 이 화면은 그것을 ProductMaster ID 처럼 사용해
 *     - GET/PUT 전역 product_ai_contents (pop_short / pop_long)
 *     - GET /api/v1/products/:productId/pop/:layout (ProductMaster POP PDF)
 *   를 호출했다. 매장 사용자에게 전역 ai-contents 쓰기는 금지이며, local UUID 는 ProductMaster
 *   endpoint 의 유효한 식별자가 아니다 → 독립 저장·렌더 기능을 종료한다.
 *
 * 현재 역할:
 *   북마크·기존 내부 링크 보호용 legacy route. canonical POP 제작 화면으로 1홉 replace 수렴한다.
 *   source identity(store_local_products.id + origin='local')만 router state 로 전달하고,
 *   상품명·문구·대표 이미지는 canonical 화면이 organization-scoped API 로 다시 조회한다.
 *
 * 신규 저장 계약·신규 렌더러 없음. 진입 액션(상품 목록 / 마케팅 자산)은 이미 canonical 화면으로
 * 직접 이동하므로 이 route 를 경유하지 않는다.
 */

import { Navigate, useParams } from 'react-router-dom';
import { CANONICAL_STORE_POP_ROUTE, buildLocalProductPopState } from '@o4o/store-ui-core';

export function ProductPopBuilderPage() {
  const { productId } = useParams<{ productId: string }>();

  return (
    <Navigate
      to={CANONICAL_STORE_POP_ROUTE}
      replace
      state={productId ? buildLocalProductPopState({ id: productId }) : undefined}
    />
  );
}
