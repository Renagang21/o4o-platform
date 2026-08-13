/**
 * createEventOfferApi — 매장측 이벤트 오퍼 공통 클라이언트 팩토리
 *
 * WO-O4O-STORE-HUB-API-CLIENT-AND-SERVICE-SCOPE-ALIGNMENT-V1
 *
 * 배경 (census §2 판정: SAME_CONTRACT_DIFFERENT_PREFIX)
 *   K-Cosmetics `cosmeticsEventOfferApi` 와 GlycoPharm `glycopharmEventOfferApi` 는
 *   **주석 · export 이름 · URL prefix 한 조각을 빼면 완전히 동일한 파일**이었다.
 *   (타입 4개와 두 메서드 본문이 문자 단위로 일치)
 *
 *   backend 도 두 서비스가 **동일한 `EventOfferService` 를 serviceKey 만 바꿔 호출하는
 *   thin controller** 다(`routes/cosmetics/controllers/event-offer.controller.ts` ·
 *   `routes/glycopharm/controllers/event-offer.controller.ts`).
 *   → client 사본을 유지할 근거가 없다.
 *
 * 범위에서 제외한 서비스 (근거는 CHECK §2 매트릭스)
 *   - KPA      : legacy `/groupbuy*` 네임스페이스(stats · my-participations 포함).
 *                endpoint 집합 자체가 달라 DIFFERENT_CONTRACT.
 *   - Neture   : `/neture/event-offers/*` 로 형상은 같으나 공급자 축 화면이 소비한다.
 *                WO §8 이 "Store Hub client factory 에 Neture 화면을 억지로 편입하지
 *                않는다" 고 지정 → 계약 동일성만 CHECK 에 기록한다.
 *   - PharmacyHub : 이벤트 오퍼 매장 화면 자체가 없다.
 *
 * 서비스가 소유하는 것: **전송(axios) · basePath prefix · export 이름** 뿐이다.
 * 전송 URL · query · body · 응답 형상은 무변경이다.
 */

/**
 * 서비스가 주입하는 최소 전송 계층.
 *
 * `createStoreHubApi` 와 달리 **axios 응답 래퍼(`{ data }`)를 그대로 반환**한다.
 * 기존 두 client 가 `api.get<T>(url)`(= `Promise<AxiosResponse<T>>`) 를 그대로 돌려주고
 * 공통 `EventOffersHubList` 가 `res.data?.data` 로 읽고 있기 때문이다.
 * 여기서 언랩하면 소비처 계약이 바뀐다 → 의도적으로 래퍼를 유지한다.
 */
export interface EventOfferHttp {
  get<T>(url: string): Promise<{ data: T }>;
  post<T>(url: string, body?: unknown): Promise<{ data: T }>;
}

export interface CreateEventOfferApiConfig {
  /**
   * 서비스 네임스페이스를 포함한 이벤트 오퍼 base path.
   * 예) `/cosmetics/event-offers` · `/glycopharm/event-offers`
   * 서비스명을 이 파일에서 하드코딩하지 않는다(WO §3).
   */
  basePath: string;
}

// ─── 응답 타입 (KCos · GP 공통 — 두 사본이 동일했다) ──────────────────────────

export interface EnrichedEventOffer {
  id: string;
  offerId: string;
  price: number | null;
  isActive: boolean;
  status: 'pending' | 'approved' | 'active' | 'ended' | 'canceled';
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
  supplierId: string;
  unitPrice: number | null;
  productName: string;
  supplierName: string;
  totalQuantity: number | null;
  perOrderLimit: number | null;
  perStoreLimit: number | null;
}

export interface EnrichedEventOffersResponse {
  success: boolean;
  data: EnrichedEventOffer[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** 이벤트 오퍼 바로 주문(participate) 응답 — checkoutService.createOrder() 결과 스냅샷 */
export interface EventOfferOrderResult {
  orderId: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
}

export interface EventOfferOrderResponse {
  success: boolean;
  data: EventOfferOrderResult;
}

export interface EventOfferApiClient {
  /**
   * approved + 진행중인 이벤트 오퍼 목록.
   * `status='active'` = approved AND start/end window OK AND quantity>0 (backend 판정).
   */
  listActive(page?: number, limit?: number): Promise<{ data: EnrichedEventOffersResponse }>;
  /**
   * @deprecated WO-O4O-EVENT-OFFER-PARTICIPATE-LEGACY-DEMOTION-V1
   * Buyer 주문 진입은 canonical Store Cart 흐름으로 이전됐다:
   *   장바구니 담기 → `/store-hub/cart` → checkout-confirm.
   * legacy/internal 호환용으로만 유지한다(buyer UI 직접 호출 0건).
   */
  participate(id: string, quantity?: number): Promise<{ data: EventOfferOrderResponse }>;
}

export function createEventOfferApi(
  http: EventOfferHttp,
  config: CreateEventOfferApiConfig,
): EventOfferApiClient {
  const { basePath } = config;

  return {
    listActive: (page = 1, limit = 20) => {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: 'active',
      });
      return http.get<EnrichedEventOffersResponse>(`${basePath}/enriched?${qs.toString()}`);
    },

    participate: (id: string, quantity = 1) =>
      http.post<EventOfferOrderResponse>(`${basePath}/${id}/participate`, { quantity }),
  };
}
