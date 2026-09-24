import axios from 'axios';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'https://o4o-core-api-117791934476.asia-northeast3.run.app';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Bearer 토큰을 Authorization 헤더에 주입 */
export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

// ── 세션 만료(401) 처리 ──────────────────────────────────────────────
// AuthContext 가 핸들러를 등록하고, 인터셉터가 401 시 1회 호출한다.
// (WO-O4O-MOBILE-AUTH-SESSION-EXPIRY-HANDLING-V1)

let onUnauthorized: (() => void) | null = null;

/** 401 발생 시 호출될 세션 만료 핸들러 등록 (AuthContext 에서 주입) */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? '';
    // 로그인 요청 자체의 401 은 "일반 로그인 실패" 이므로 세션 만료로 처리하지 않는다.
    const isAuthEntryCall = url.includes('/auth/login') || url.includes('/auth/refresh');
    if (status === 401 && !isAuthEntryCall) {
      // 핸들러 내부에서 중복/루프 가드를 수행한다.
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

/**
 * accessToken(JWT) 의 exp 를 best-effort 로 파싱해 만료 여부를 판정한다.
 * 파싱이 불안정하면 `false`(만료 아님)로 처리하고, 실제 만료는 401 인터셉터가 처리한다.
 */
export function isAccessTokenExpired(token: string, skewMs = 10_000): boolean {
  try {
    const seg = token.split('.')[1];
    if (!seg) return false;
    const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    if (typeof atob !== 'function') return false;
    const payload = JSON.parse(atob(b64)) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= Date.now() + skewMs;
  } catch {
    return false;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
}

// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: loginApi(POST /auth/login) 는 은퇴했다.