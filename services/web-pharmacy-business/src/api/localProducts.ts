import { storeJsonFetch as request } from "./storeJsonFetch";
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

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const BASE = () => `${API_BASE}/api/v1/kpa/store`;

// ==================== Helpers ====================

export const {
  fetchLocalProducts,
  getLocalProduct,
  createLocalProduct,
  updateLocalProduct,
  deleteLocalProduct,
} = createLocalProductClient({ BASE, request });
