/**
 * Centralized API Client — KPA Branch
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 *
 * 기존 서비스와 동일: AuthClient(localStorage 전략) + 401 자동 갱신 axios 인스턴스.
 * 환경변수 직접 사용 / 하드코딩 URL 금지 규칙에 따라 base URL 은 이 파일에서만 읽는다.
 */
import { AuthClient } from '@o4o/auth-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

export { API_BASE_URL };

export const authClient = new AuthClient(`${API_BASE_URL}/api/v1`, {
  strategy: 'localStorage',
});

/** Axios instance with auto-refresh interceptor */
export const api = authClient.api;
