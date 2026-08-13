/**
 * StoreCartPage — 내 장바구니 (GlycoPharm)
 *
 * WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2
 * WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1
 *   K-Cosmetics / GlycoPharm 의 near-identical 장바구니 화면을 공통 Core 로 이관했다.
 *   상태 기계 = `useStoreCart`, 화면 = `StoreCartView`(accent 만 다름).
 *   API endpoint · payload · 주문 확정 계약은 변경하지 않았다.
 *
 * canonical Store Cart 의 매장 경영자(buyer) 확인/확정 화면. 공급자별 묶음 조회·수량변경·삭제·
 * 비우기 + 주문 확정(공급자별 checkout_order 생성). priceSnapshot 은 표시용 — 확정 시 재검증.
 */
import { useNavigate } from 'react-router-dom';
import { StoreCartView, useStoreCart } from '@o4o/store-ui-core';
import { storeCartApi } from '@/api/storeCart';
import { CART_SERVICE_KEY } from '@/utils/eventOfferCart';

export function StoreCartPage() {
  const navigate = useNavigate();
  const cart = useStoreCart({ api: storeCartApi, serviceKey: CART_SERVICE_KEY });

  return (
    <StoreCartView
      cart={cart}
      accent="teal"
      emptyAction={{ label: '이벤트 상품 보기', onClick: () => navigate('/store-hub/event-offers') }}
    />
  );
}

export default StoreCartPage;
