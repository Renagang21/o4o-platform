/**
 * StoreCartPage — 내 장바구니 (읽기/편집, 주문 확정 전)
 *
 * WO-O4O-EVENT-OFFER-TO-CART-MIGRATION-V1 (Phase 1a)
 * WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1: 상태 기계 `useStoreCart` 공유
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   화면(공급자 묶음 · 수량 stepper · 배송비 미리보기 · 합계 · 주문 확정)이 K-Cosmetics /
 *   GlycoPharm 과 동일해 공통 `StoreCartView` 로 편입. 이 파일은 **accent + header/empty slot** 만
 *   소유한다. API endpoint · payload · 주문 확정 계약 무변경.
 *   inline style(283줄) 제거 — 금액 표기는 공통 View 기준(₩ prefix)으로 정규화.
 *
 * Canonical Store Cart 의 매장 경영자(buyer) 확인 화면. 공급자별 묶음으로
 * 담긴 항목을 보여주고 수량 변경/삭제/비우기 + 주문 확정(공급자별 checkout_order 생성).
 *   priceSnapshot 은 표시용 임시값이며 checkout 확정 시 재검증된다.
 */

import { useNavigate } from 'react-router-dom';
import { StoreCartView, useStoreCart } from '@o4o/store-ui-core';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/common';
import { storeCartApi } from '../../api';

const CART_SERVICE_KEY = 'kpa-society';

export function StoreCartPage() {
  const navigate = useNavigate();
  const cart = useStoreCart({ api: storeCartApi, serviceKey: CART_SERVICE_KEY });

  if (cart.loading) {
    return <LoadingSpinner message="장바구니를 불러오는 중..." />;
  }

  const goEventOffers = () => navigate('/store-hub/event-offers');

  return (
    <StoreCartView
      cart={cart}
      accent="violet"
      containerClassName="max-w-[880px] mx-auto px-5 pb-10 space-y-4"
      header={
        <PageHeader
          title="내 장바구니"
          breadcrumb={[
            { label: '홈', href: '/' },
            { label: '매장 허브', href: '/store-hub' },
            { label: '내 장바구니' },
          ]}
        />
      }
      empty={
        <EmptyState
          icon="🛒"
          title="장바구니가 비어 있습니다"
          description="이벤트 상품을 둘러보고 장바구니에 담아보세요."
          action={{ label: '이벤트 상품 보기', onClick: goEventOffers }}
        />
      }
      emptyAction={{ label: '이벤트 상품 보기', onClick: goEventOffers }}
    />
  );
}

export default StoreCartPage;
