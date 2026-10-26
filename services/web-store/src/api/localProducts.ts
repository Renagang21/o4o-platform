import { createLocalProductClient } from "@o4o/store-ui-core/api/localProducts";
export type {
  BadgeType,
  LocalProduct,
  LocalProductInput,
  LocalProductListResponse,
} from "@o4o/store-ui-core/api/localProducts";

/**
 * Local Product API Client — Store Display Domain
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 *
 * Service-scoped API: /api/v1/kpa/store/local-products
 * WO-O4O-STORE-LOCAL-PRODUCTS-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1:
 *   서비스 중립 경로(`/api/v1/store/local-products`)는 다중 조직 사용자에게 타 서비스
 *   조직을 선택할 수 있어, 같은 My Store 문맥의 handled-products 와 다른 매장을 보게 된다.
 *   서비스 스코프 경로(`/api/v1/kpa/store/local-products`)로 이전한다 — 백엔드에서 serviceKey 로 조직을 확정한다.
 * Local Products are Display Domain only — NOT Commerce Objects.
 */

import { apiV1Service } from "../lib/serviceContext";
import { storeProductFetch } from "./storeProductFetch";

// Unified Store: base 는 요청 시점의 서비스 문맥에서 만든다 (KPA 의 module 상수 `/api/v1/kpa/store` 대신)
const BASE = () => `${apiV1Service()}/store`;

// ==================== Helpers ====================

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await storeProductFetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: "Network error" }));
    const error: any = new Error(
      body.error || body.message || `HTTP ${response.status}`,
    );
    error.status = response.status;
    error.code = body.code;
    throw error;
  }

  return response.json();
}

export const {
  fetchLocalProducts,
  getLocalProduct,
  createLocalProduct,
  updateLocalProduct,
  deleteLocalProduct,
} = createLocalProductClient({ BASE, request });
