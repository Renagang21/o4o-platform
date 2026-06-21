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
