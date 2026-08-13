/**
 * createSupplyCatalogApi — 공급 상품 카탈로그 클라이언트 팩토리
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1 (선행 census F1)
 *
 * `SupplyCatalogHub` 가 요구하는 3 endpoint 는 3 서비스에서 경로 suffix 가 동일했다:
 *   GET    /pharmacy/products/catalog?distributionType&operatorView&limit&offset
 *   POST   /pharmacy/products/apply            { supplyProductId }
 *   DELETE /pharmacy/products/by-offer/:offerId
 * 차이는 서비스 네임스페이스 prefix · 전송 계층(언랩) · 서비스별 응답 타입뿐이므로
 * 경로·query·payload 구성만 여기로 모으고, 응답 타입은 제네릭으로 서비스가 유지한다.
 * API 계약 무변경(호출 경로·파라미터 이름·body 동일).
 *
 * 의미 보존: `apply` = 공급 상품 **신청**(ProductApproval PENDING). 주문이 아니다.
 */

/**
 * 서비스가 주입하는 최소 전송 계층.
 * url 은 서비스 네임스페이스 기준 상대 경로이며, 각 메서드는 **응답 body 를 그대로** 반환한다.
 */
export interface SupplyCatalogHttp {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, body?: unknown): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

/** 카탈로그 query — 서비스별 추가 필터(category/recommended 등)도 그대로 전달한다. */
export interface SupplyCatalogQueryParams {
  distributionType?: string;
  operatorView?: boolean;
  limit?: number;
  offset?: number;
  category?: string;
  recommended?: boolean;
  /** K-Cosmetics / GlycoPharm 은 canonical service_key 를 명시 전송한다(KPA 는 경로 기반). */
  service_key?: string;
}

export interface SupplyCatalogApiClient<TListResponse, TApplyResult, TCancelResult> {
  getCatalog(params?: SupplyCatalogQueryParams): Promise<TListResponse>;
  applyBySupplyProductId(supplyProductId: string): Promise<TApplyResult>;
  cancelProductByOfferId(offerId: string): Promise<TCancelResult>;
}

export function createSupplyCatalogApi<
  TListResponse,
  TApplyResult = unknown,
  TCancelResult = unknown,
>(http: SupplyCatalogHttp): SupplyCatalogApiClient<TListResponse, TApplyResult, TCancelResult> {
  return {
    getCatalog: (params) => {
      const qs = new URLSearchParams();
      Object.entries(params ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== false) {
          qs.set(key, String(value));
        }
      });
      const query = qs.toString();
      return http.get<TListResponse>(
        `/pharmacy/products/catalog${query ? `?${query}` : ''}`,
      );
    },

    applyBySupplyProductId: (supplyProductId) =>
      http.post<TApplyResult>('/pharmacy/products/apply', { supplyProductId }),

    cancelProductByOfferId: (offerId) =>
      http.delete<TCancelResult>(`/pharmacy/products/by-offer/${offerId}`),
  };
}
