/**
 * Centralized API Client — GlycoPharm
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1
 *
 * authClient.api (Axios) 기반 — 401 자동 갱신 지원
 * - Access token 만료 시 자동으로 refresh token 갱신
 * - 동시 401 요청 큐 처리
 * - localStorage 전략 (o4o_accessToken / o4o_refreshToken)
 */
import { AuthClient } from '@o4o/auth-client';
import { configureStoreProductsApi } from '@o4o/store-products-ui';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

export { API_BASE_URL };

export const authClient = new AuthClient(`${API_BASE_URL}/api/v1`, {
  strategy: 'localStorage',
});

/** Axios instance with auto-refresh interceptor */
export const api = authClient.api;

// WO-O4O-STORE-PRODUCTS-AUTHCLIENT-INJECTION-FIX-V1:
// store-products-ui 공통 패키지가 GlycoPharm 의 localStorage-strategy authClient 를 사용하도록 주입.
configureStoreProductsApi(api);

// WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1
// generic `/api/v1/lms/*` 를 쓰는 서비스는 요청마다 canonical serviceKey 를 실어야
// 백엔드가 service boundary 를 적용할 수 있다. 호출부마다 붙이면 누락이 생기므로
// LMS 경로 전체에 대해 client 계층에서 한 번만 부착한다 (read/write 모두).
//
// ⚠️ client-side filtering 이 아니다. 서버 SQL 필터의 입력일 뿐이다.
// 이미 명시된 값(@o4o/lms-client 가 붙인 값)은 덮어쓰지 않는다 — 중복 전달 방지.
const LMS_SERVICE_KEY = 'glycopharm';

interface LmsScopedRequestConfig {
  url?: string;
  params?: Record<string, unknown>;
}

api.interceptors.request.use((config: LmsScopedRequestConfig) => {
  const url = config.url ?? '';
  if (!url.startsWith('/lms/') && url !== '/lms') return config;

  const params = config.params ?? {};
  if (params.serviceKey === undefined && !url.includes('serviceKey=')) {
    config.params = { ...params, serviceKey: LMS_SERVICE_KEY };
  }
  return config;
});
