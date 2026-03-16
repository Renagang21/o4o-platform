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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

export { API_BASE_URL };

export const authClient = new AuthClient(`${API_BASE_URL}/api/v1`, {
  strategy: 'localStorage',
});

/** Axios instance with auto-refresh interceptor */
export const api = authClient.api;
