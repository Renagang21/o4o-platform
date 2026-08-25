/**
 * Pharmacy-Hub 매장 자체 상품 API 클라이언트
 *
 * WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1
 *
 * 계약 (backend: controllers/pharmacy-hub/PharmacyHubLocalProductController.ts):
 *   GET    /pharmacy-hub/store-owner/local-products
 *   POST   /pharmacy-hub/store-owner/local-products
 *   GET    /pharmacy-hub/store-owner/local-products/:id
 *   PUT    /pharmacy-hub/store-owner/local-products/:id
 *   DELETE /pharmacy-hub/store-owner/local-products/:id   (비활성화 — 물리 삭제 아님)
 *
 * ⚠️ organizationId 는 **보내지 않는다.**
 *   대상 조직은 서버가 인증 사용자 + Pharmacy-Hub enrollment 로 결정한다
 *   (0개=STORE_NOT_CONNECTED · 2개 이상=AMBIGUOUS_STORE_CONNECTION · 서버가 409).
 *   본문에 organizationId 를 넣으면 서버가 400 FIELD_NOT_ACCEPTED 로 거부한다.
 *
 * 도메인 주의: StoreLocalProduct 는 Display Domain 이다 — 주문·결제와 연결되지 않는다.
 */
import { api } from '../apiClient';
import type {
  StoreLocalProduct,
  StoreLocalProductInput,
} from '@o4o/store-ui-core';

const BASE = '/pharmacy-hub/store-owner/local-products';

function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body.data as T;
}

/** 매장 연결 상태 — 목록 응답에 함께 실린다 (미연결이어도 200 + 빈 목록). */
export interface LocalProductsStoreConnection {
  status: 'connected' | 'not_connected' | 'ambiguous';
  candidateCount: number;
  errorCode: 'AMBIGUOUS_STORE_CONNECTION' | null;
}

/**
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §7 (상품 설명 축)
 *   공통 backend(`store-local-products.service.ts`)는 PH 에도 `detail_html` 을 그대로
 *   select·저장한다. 공통 `StoreLocalProduct(Input)` 이 최소 공통 부분집합일 뿐이므로
 *   `StoreLocalProductsApi<T, I>` 가 안내하는 방식대로 서비스 측에서 확장한다
 *   — API 계약 변경 아님, 신규 필드·table 0.
 */
export type PharmacyHubLocalProduct = StoreLocalProduct & { detailHtml?: string | null };
export type PharmacyHubLocalProductInput = Partial<StoreLocalProductInput> & {
  detailHtml?: string | null;
};

export interface LocalProductsPage {
  storeConnection: LocalProductsStoreConnection;
  items: PharmacyHubLocalProduct[];
  total: number;
  page: number;
  limit: number;
}

/**
 * 목록. `activeOnly`(문자열 'true')를 주면 활성만 — 기본은 관리 화면이므로 비활성도 포함한다.
 * StoreLocalProductsManager 의 `StoreLocalProductsApi` 시그니처를 그대로 만족한다.
 */
export async function fetchLocalProducts(params?: {
  page?: number;
  limit?: number;
  activeOnly?: string;
}): Promise<LocalProductsPage> {
  const res = await api.get(BASE, { params });
  return unwrap<LocalProductsPage>(res.data, '매장 자체 상품을 불러오지 못했습니다.');
}

export async function createLocalProduct(input: StoreLocalProductInput): Promise<StoreLocalProduct> {
  const res = await api.post(BASE, input);
  return unwrap<StoreLocalProduct>(res.data, '매장 자체 상품을 등록하지 못했습니다.');
}

/**
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §7
 *   백엔드 update 는 실제로 **부분 갱신**이다 (store-local-products.service.ts 가
 *   모든 필드를 `!== undefined` 로 가드한다). KPA 의 동명 client 도 `Partial<...>` 이다.
 *   PH 만 전체 입력을 요구하던 것이 계약보다 좁았던 것이므로 canonical 형태로 맞춘다.
 *   기존 전체 입력 호출부는 그대로 통과한다 (runtime 동작 변화 0).
 */
export async function updateLocalProduct(
  id: string,
  input: PharmacyHubLocalProductInput,
): Promise<PharmacyHubLocalProduct> {
  const res = await api.put(`${BASE}/${id}`, input);
  return unwrap<PharmacyHubLocalProduct>(res.data, '매장 자체 상품을 수정하지 못했습니다.');
}

/** 비활성화(soft delete). 공통 구조에 물리 삭제 경로가 없으며 새로 만들지 않는다. */
export async function deleteLocalProduct(id: string): Promise<void> {
  const res = await api.delete(`${BASE}/${id}`);
  unwrap<unknown>(res.data, '매장 자체 상품을 비활성화하지 못했습니다.');
}
