/**
 * 선택 매장 헤더 — CHECK-O4O-URL-FIRST-CENSUS-V1 §21-14
 *
 * 한 서비스에 매장이 2개 이상인 경영자는 서버의 매장 조직 해석이 409 AMBIGUOUS_STORE_CONNECTION 으로 막았다
 * (화면에서 매장을 골라도 API 에 전달되지 않았다). 이 모듈은 선택된 매장을 `X-Store-Organization-Id` 로
 * API 요청에 싣는다. 서버는 이 값을 **이미 허용된 후보 안에서 고르는 힌트**로만 쓴다(권한 근거 아님).
 *
 * api 모듈 20여 개가 각자 fetch 로 헤더를 만들기 때문에, 개별 수정 대신 API origin 으로 가는 요청에만
 * 한 곳에서 붙인다. `X-Organization-Id` 는 signage 조회 범위 등 다른 의미로 쓰여 재사용하지 않는다.
 */
import { API_BASE_URL, api } from './apiClient';

export const STORE_ORGANIZATION_HEADER = 'X-Store-Organization-Id';

let activeStoreOrganizationId: string | null = null;

/** StoreContext 만 호출한다 — 현재 매장(1개 자동 · 선택 · 복원) 또는 null. */
export function setActiveStoreOrganizationId(id: string | null): void {
  activeStoreOrganizationId = id;
}

export function getActiveStoreOrganizationId(): string | null {
  return activeStoreOrganizationId;
}

function isApiUrl(url: string): boolean {
  return url === API_BASE_URL || url.startsWith(`${API_BASE_URL}/`);
}

let installed = false;

export function installStoreOrganizationHeader(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const orgId = activeStoreOrganizationId;
    if (!orgId) return nativeFetch(input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!isApiUrl(url)) return nativeFetch(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has(STORE_ORGANIZATION_HEADER)) headers.set(STORE_ORGANIZATION_HEADER, orgId);
    return nativeFetch(input, { ...init, headers });
  };

  api.interceptors.request.use(<T extends { headers?: Record<string, unknown> }>(config: T): T => {
    const orgId = activeStoreOrganizationId;
    if (orgId && config.headers && !config.headers[STORE_ORGANIZATION_HEADER]) {
      config.headers[STORE_ORGANIZATION_HEADER] = orgId;
    }
    return config;
  });
}
