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

/**
 * `/api/v1/auth/login` 응답 봉투.
 *
 * 백엔드(Phase 6-7 Cookie Auth Primary)는 httpOnly 쿠키를 1차 인증으로 사용하고,
 * body 토큰은 `includeLegacyTokens: true` 또는 cross-origin 요청에만 포함한다.
 * 모바일은 쿠키 대신 Bearer 토큰을 쓰므로 토큰은 `data.tokens.accessToken` 에서 읽는다.
 * (IR-O4O-MOBILE-PRODUCT-COLLECTION-APP-SCOPE-V1 R1 — 라이브 확인 완료)
 */
export interface LoginResponse {
  success: boolean;
  data?: {
    message?: string;
    user: AuthUser;
    tokens?: {
      accessToken: string;
      refreshToken?: string;
      expiresIn?: number;
    };
    /** 레거시/대체 shape 관용 (구버전 봉투 대비) */
    accessToken?: string;
  };
  error?: string;
  message?: string;
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  // includeLegacyTokens: 모바일은 Bearer 토큰을 사용하므로 응답 body 토큰을 명시적으로 요청한다.
  // (미지정 + Origin 헤더 없음 → 백엔드가 토큰을 body 에 넣지 않아 쿠키 전용이 됨)
  const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
    email,
    password,
    includeLegacyTokens: true,
  });
  return response.data;
}
