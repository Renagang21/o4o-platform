/**
 * createHubContentApi — HUB 콘텐츠 목록 공통 클라이언트 팩토리
 *
 * WO-O4O-STORE-HUB-API-CLIENT-AND-SERVICE-SCOPE-ALIGNMENT-V1
 *
 * 배경 (census §2 판정: SAME_CONTRACT)
 *   K-Cosmetics · GlycoPharm · Neture 세 사본이 **동일한 endpoint** 를 호출한다:
 *     GET /api/v1/hub/contents?serviceKey={key}&sourceDomain=...
 *   prefix 조차 다르지 않다(공용 `/hub` 네임스페이스). 세 파일의 차이는
 *   주석 · apiClient import 경로 · `SERVICE_KEY` 상수뿐이었다.
 *   → serviceKey 는 값(config)이지 코드 사본의 근거가 아니다.
 *
 * 범위에서 제외한 서비스
 *   - KPA    : 같은 `/hub` 축이지만 **비인증 raw `fetch`** 로 호출하고 `producer` 필터를
 *              쓴다(인증 자세가 다르다) → DIFFERENT_CONTRACT. CHECK §2 참조.
 *   - Neture : 계약은 동일하나 공급자 축 화면이 소비한다. WO §8 지침에 따라
 *              억지 편입 대신 계약 동일성만 기록한다.
 *
 * ── 패키지 경계 ──────────────────────────────────────────────────────────────
 * `store-ui-core` 는 `@o4o/types` 에 **의도적으로 의존하지 않는다**(package.json 의존성 없음).
 * 응답 타입(`HubContentListResponse`)은 `@o4o/types/hub-content` 소유이므로
 * 여기서 import 하지 않고 **제네릭 파라미터로 서비스가 주입**한다.
 * 덕분에 타입 계약은 `@o4o/types` 에 그대로 남고 Core 는 URL 조립만 소유한다.
 */

/**
 * 서비스가 주입하는 최소 전송 계층.
 * 각 메서드는 **응답 body 를 그대로** 반환해야 한다(axios 라면 `.data` 언랩 후 전달).
 * 기존 세 사본이 모두 `res.data` 를 반환했으므로 소비처 계약은 무변경이다.
 */
export interface HubContentHttp {
  get<T>(url: string): Promise<T>;
}

export interface CreateHubContentApiConfig {
  /** `serviceKey` query 값. 예) `k-cosmetics` · `glycopharm` · `neture` */
  serviceKey: string;
}

/** 세 사본이 공유하던 목록 파라미터. */
export interface HubContentListParams {
  sourceDomain?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface HubContentApiClient<TListResponse> {
  list(params?: HubContentListParams): Promise<TListResponse>;
}

export function createHubContentApi<TListResponse>(
  http: HubContentHttp,
  config: CreateHubContentApiConfig,
): HubContentApiClient<TListResponse> {
  const { serviceKey } = config;

  return {
    list(params: HubContentListParams = {}): Promise<TListResponse> {
      // query 조립 순서·조건은 기존 사본과 동일하게 유지한다(전송 URL 무변경).
      const searchParams = new URLSearchParams();
      searchParams.set('serviceKey', serviceKey);
      if (params.sourceDomain) searchParams.set('sourceDomain', params.sourceDomain);
      if (params.type) searchParams.set('type', params.type);
      if (params.search) searchParams.set('search', params.search);
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));

      return http.get<TListResponse>(`/hub/contents?${searchParams.toString()}`);
    },
  };
}
