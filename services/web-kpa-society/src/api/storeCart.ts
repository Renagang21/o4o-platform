/**
 * Store Cart API 서비스 — Canonical Store Cart
 *
 * WO-O4O-EVENT-OFFER-TO-CART-MIGRATION-V1 (Phase 1a)
 *
 * 매장 경영자(buyer)의 서버 백엔드 장바구니. 이벤트오퍼/B2B/일반 상품을 단일
 * cart item 표준(sourceType)으로 담는다. foundation backend:
 *   WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1
 *
 * 경계: serviceKey(URL 경로) + buyerId(인증 사용자, body 신뢰 안 함).
 *   - core 네임스페이스(/api/v1)이므로 /kpa 접두사가 없는 coreApiClient 사용.
 *   - serviceKey 는 호출부에서 'kpa-society' 로 전달한다.
 *
 * WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1:
 *   3 서비스에 중복돼 있던 타입 정의를 @o4o/store-ui-core 로 이관하고 여기서 re-export 한다.
 * WO-O4O-STORE-HUB-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1:
 *   endpoint 목록 복제도 제거. 이 파일은 이제 **전송 계층 주입**만 소유한다.
 *   coreApiClient 는 이미 응답 body 를 반환하므로 언랩이 필요 없다. API 계약 무변경.
 */

import { createStoreCartApi } from '@o4o/store-ui-core';
import { coreApiClient } from './client';

export type {
  CartSourceType,
  CartPricingSource,
  StoreCartItem,
  AddCartItemInput,
  SupplierGroupShipping,
  SupplierGroup,
  CreatedOrderSummary,
  FailedCartItem,
  CheckoutConfirmResult,
} from '@o4o/store-ui-core';

export const storeCartApi = createStoreCartApi(coreApiClient);
