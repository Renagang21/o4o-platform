/**
 * Store Cart API 서비스 — Canonical Store Cart (GlycoPharm)
 *
 * WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2
 *
 * KPA 에서 검증된 canonical Store Cart 흐름을 GlycoPharm 으로 확장.
 * backend foundation: WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1 / -CONFIRMATION-V1.
 *
 * 경계: serviceKey(URL 경로) + buyerId(인증 사용자). core 네임스페이스(/api/v1)이므로
 *   `api`(authClient.api, baseURL=/api/v1) 를 그대로 사용한다. serviceKey 는 'glycopharm'.
 *
 * WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1: 타입을 공통 Core 로 이관.
 * WO-O4O-STORE-HUB-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1:
 *   endpoint 목록 복제 제거. 이 파일은 axios 응답의 `.data` 언랩만 소유한다. API 계약 무변경.
 */
import { createStoreCartApi } from '@o4o/store-ui-core';
import type { StoreCartHttp } from '@o4o/store-ui-core';
import { api } from '../lib/apiClient';

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

const axiosApi = api as unknown as {
  get: <T>(url: string) => Promise<{ data: T }>;
  post: <T>(url: string, body?: unknown) => Promise<{ data: T }>;
  patch: <T>(url: string, body?: unknown) => Promise<{ data: T }>;
  delete: <T>(url: string) => Promise<{ data: T }>;
};

// 제네릭 T 를 전송 계층까지 전파해야 하므로 각 메서드를 제네릭 함수로 명시한다.
// 제네릭은 메서드마다 명시한다 — 화살표 함수는 대상 시그니처의 T 를 추론하지 못한다.
const http: StoreCartHttp = {
  get: <T,>(url: string) => axiosApi.get<T>(url).then((r) => r.data),
  post: <T,>(url: string, body?: unknown) => axiosApi.post<T>(url, body).then((r) => r.data),
  patch: <T,>(url: string, body?: unknown) => axiosApi.patch<T>(url, body).then((r) => r.data),
  delete: <T,>(url: string) => axiosApi.delete<T>(url).then((r) => r.data),
};

export const storeCartApi = createStoreCartApi(http);
