import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  AuthResponse,
  GoogleAuthResponse,
  GoogleAuthConfig,
  GoogleSignupConsents,
} from './types.js';
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearAllTokens,
  updateAuthStorage,
} from './token-storage.js';

/**
 * Auth Strategy
 *
 * Phase 6-7: Cookie Auth Primary
 * - 'cookie': Use httpOnly cookies (DEFAULT, recommended for B2C)
 * - 'localStorage': Use localStorage tokens (legacy, for specific use cases)
 *
 * @see docs/architecture/auth-ssot-declaration.md (Phase 6-7)
 */
export type AuthStrategy = 'cookie' | 'localStorage';

export interface AuthClientOptions {
  /**
   * Authentication strategy
   * - 'cookie': Use httpOnly cookies (DEFAULT)
   * - 'localStorage': Use localStorage tokens (legacy)
   *
   * Phase 6-7: Cookie is the primary strategy for B2C launch
   */
  strategy?: AuthStrategy;
}

/**
 * Extract tokens from server response.
 * Handles both BaseController.ok() wrapped format and flat format.
 *
 * Wrapped:  { success, data: { tokens: { accessToken, refreshToken } } }
 * Flat:     { accessToken, refreshToken }
 *
 * WO-NETURE-AUTH-TOKEN-FAMILY-MISMATCH-FIX-V1
 */
function extractTokensFromResponse(responseData: any): {
  accessToken?: string;
  refreshToken?: string;
} {
  // Path 1: BaseController.ok() wrapped — { success, data: { tokens: { ... } } }
  const wrapped = responseData?.data?.tokens;
  if (wrapped?.accessToken) {
    return { accessToken: wrapped.accessToken, refreshToken: wrapped.refreshToken };
  }

  // Path 2: data-level tokens (no nested tokens key) — { success, data: { accessToken, ... } }
  const dataLevel = responseData?.data;
  if (dataLevel?.accessToken) {
    return { accessToken: dataLevel.accessToken, refreshToken: dataLevel.refreshToken };
  }

  // Path 3: flat response — { accessToken, refreshToken }
  if (responseData?.accessToken) {
    return { accessToken: responseData.accessToken, refreshToken: responseData.refreshToken };
  }

  return {};
}

export class AuthClient {
  private baseURL: string;
  public api: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string | null) => void> = [];
  private strategy: AuthStrategy;
  /**
   * WO-O4O-NETURE-AUTH-ERROR-CONTRACT-AND-LEGACY-TOKEN-RECOVERY-FIX-V1:
   * 로그아웃(명시적 logout/logoutAll · refresh 실패 정리)마다 증가하는 세션 세대.
   * refresh 시작 시점의 세대와 응답 시점의 세대가 다르면 그 응답은 "로그아웃 이후 도착한 늦은 응답" 이므로
   * 토큰을 저장하지 않는다. 다른 탭 로그아웃은 세대가 아니라 storage 의 refresh token 부재로 판정한다.
   */
  private sessionGeneration = 0;

  constructor(baseURL: string, options?: AuthClientOptions) {
    this.baseURL = baseURL;
    // Phase 6-7: Cookie Auth Primary - default strategy is 'cookie'
    this.strategy = options?.strategy || 'cookie';

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 120000, // 120 seconds for AI generation
      headers: {
        'Content-Type': 'application/json',
      },
      // Phase 6-7: Cookie Auth Primary - include credentials for cookie-based auth
      withCredentials: this.strategy === 'cookie',
    }) as any;

    // Add auth token to requests
    // Phase 6-7: Only add Authorization header for localStorage strategy
    // Cookie strategy relies on httpOnly cookies sent automatically
    this.api.interceptors.request.use((config: any) => {
      if (this.strategy === 'localStorage') {
        const token = getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      // For cookie strategy, cookies are sent automatically with withCredentials: true
      return config;
    });

    // Add response interceptor for auto-refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Check if error is 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Skip refresh for auth endpoints - 401 from login/register/refresh is expected
          const requestUrl = originalRequest?.url || '';
          if (requestUrl.includes('/auth/refresh') ||
              // WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1: Google login/signup 401 은 ID token 거절이다.
              requestUrl.includes('/auth/google/')) {
            return Promise.reject(error);
          }

          // For localStorage strategy, skip refresh if no refresh token exists
          // This prevents unnecessary refresh attempts when user is not logged in
          if (this.strategy === 'localStorage') {
            const refreshToken = getRefreshToken();
            if (!refreshToken) {
              // No refresh token - user is not logged in, just reject the error
              return Promise.reject(error);
            }
          }

          if (this.isRefreshing) {
            // Wait for token refresh
            return new Promise((resolve, reject) => {
              this.refreshSubscribers.push((token: string | null) => {
                if (token === null) {
                  // 진행 중이던 refresh 가 로그아웃으로 폐기됨 — 대기 요청도 원래 401 로 종료
                  reject(error);
                  return;
                }
                if (this.strategy === 'localStorage') {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.api.request(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          // WO-NETURE-TOKEN-RACE-FIX-V1:
          // Capture current access token before refresh attempt.
          // If a concurrent login stores a new token while this refresh is in flight,
          // the catch block should NOT clear the newly stored token.
          const tokenBeforeRefresh = this.strategy === 'localStorage' ? getAccessToken() : null;
          const generationAtStart = this.sessionGeneration;

          try {
            // Phase 6-7: Cookie Auth Primary
            // For cookie strategy, refresh token is sent via cookie automatically
            // For localStorage strategy, send refresh token in body
            const refreshPayload = this.strategy === 'localStorage'
              ? { refreshToken: getRefreshToken(), includeLegacyTokens: true }
              : {}; // Cookie strategy sends refresh token via cookie

            const response = await this.api.post('/auth/refresh', refreshPayload);

            // WO-NETURE-AUTH-TOKEN-FAMILY-MISMATCH-FIX-V1:
            // Use shared helper to correctly unwrap BaseController.ok() response
            const { accessToken, refreshToken: newRefreshToken } = extractTokensFromResponse(response.data);

            if (!accessToken) {
              // Refresh endpoint returned 200 but no usable token — treat as failure
              console.warn('[AuthClient] Refresh succeeded but no accessToken in response');
              if (this.strategy === 'localStorage' && !this.isSessionEndedSince(generationAtStart)) {
                this.sessionGeneration += 1;
                clearAllTokens();
              }
              this.rejectRefreshSubscribers();
              return Promise.reject(new Error('Refresh response missing accessToken'));
            }

            // WO-O4O-NETURE-AUTH-ERROR-CONTRACT-AND-LEGACY-TOKEN-RECOVERY-FIX-V1:
            // refresh 가 진행되는 사이 로그아웃이 일어났으면(같은 탭: 세대 증가 · 다른 탭: storage 의
            // refresh token 삭제) 늦게 도착한 이 응답으로 로그인을 되살리지 않는다.
            if (this.strategy === 'localStorage' && this.isSessionEndedSince(generationAtStart)) {
              this.rejectRefreshSubscribers();
              return Promise.reject(new Error('Refresh response discarded: session ended during refresh'));
            }

            // Phase 6-7: Only update localStorage for localStorage strategy
            if (this.strategy === 'localStorage') {
              setAccessToken(accessToken);
              if (newRefreshToken) {
                setRefreshToken(newRefreshToken);
              }
              updateAuthStorage(accessToken, newRefreshToken);
            }

            // Notify subscribers
            this.refreshSubscribers.forEach(callback => callback(accessToken));
            this.refreshSubscribers = [];

            // Retry original request with new access token
            if (this.strategy === 'localStorage') {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            return this.api.request(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear tokens
            if (this.strategy === 'localStorage') {
              // WO-NETURE-TOKEN-RACE-FIX-V1:
              // Only clear tokens if no concurrent login stored a new one while refresh was in flight.
              // Comparing current token to the one captured before refresh prevents wiping a fresh login token.
              const currentToken = getAccessToken();
              const freshLoginOccurred = tokenBeforeRefresh !== currentToken && currentToken !== null;
              if (this.isSessionEndedSince(generationAtStart)) {
                // 이미 로그아웃된 세션 — 다시 지우거나 이벤트를 내지 않는다 (대기 요청만 종료)
                this.rejectRefreshSubscribers();
              } else if (!freshLoginOccurred) {
                this.sessionGeneration += 1;
                clearAllTokens();
                this.rejectRefreshSubscribers();
                // Notify React layer (AuthContext) to set user=null.
                // auth:token-cleared is already handled by AuthContext.tsx listener.
                // Using window.dispatchEvent (not localStorage event) so it only affects
                // the current tab — no cross-tab side-effects.
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('auth:token-cleared'));
                }
              }
            }

            // WO-KPA-A-AUTH-LOOP-GUARD-STABILIZATION-V1:
            // window.location.href = '/login' 제거 — 하드 리다이렉트가 React 상태 초기화 → 무한 루프 유발
            // 토큰만 정리하고 reject → React 레이어(AuthContext)에서 user=null 처리
            const errorData = (refreshError as any)?.response?.data;
            if (errorData?.code === 'TOKEN_EXPIRED') {
              console.warn('Session expired. Tokens cleared.');
            } else {
              console.warn('Authentication failed. Tokens cleared.');
            }

            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
  //   login(email+password) 은 은퇴했다. 로그인 진입점은 `loginWithGoogle` 하나다.

  /**
   * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D)
   * Google ID token → POST /auth/google/login. 등록된 Google 계정이면 /auth/login 과 같은 세션을 연다.
   * 미등록이면 서버가 404 `GOOGLE_SIGNUP_REQUIRED` 를 돌려주고 axios 오류로 전파된다(호출부가 가입 흐름으로 분기).
   * 클라이언트는 idToken(+serviceKey) 외에 어떤 identity 필드도 보내지 않는다.
   */
  async loginWithGoogle(idToken: string, options: { serviceKey?: string } = {}): Promise<GoogleAuthResponse> {
    const response = await this.api.post('/auth/google/login', {
      idToken,
      ...(options.serviceKey && { serviceKey: options.serviceKey }),
      ...(this.strategy === 'localStorage' && { includeLegacyTokens: true }),
    });
    return this.adoptSessionResponse(response.data as { success?: boolean; data?: any });
  }

  /**
   * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D)
   * Google ID token + 약관/개인정보(+마케팅) 동의 → POST /auth/google/signup → 계정 생성 + 세션.
   */
  async signupWithGoogle(idToken: string, consents: GoogleSignupConsents): Promise<GoogleAuthResponse> {
    const response = await this.api.post('/auth/google/signup', {
      idToken,
      consents,
      ...(this.strategy === 'localStorage' && { includeLegacyTokens: true }),
    });
    return this.adoptSessionResponse(response.data as { success?: boolean; data?: any });
  }

  /** GET /auth/google/config — 공개 Client ID(secret 아님). 실패·미설정은 `{ enabled: false, clientId: null }`. */
  async getGoogleAuthConfig(): Promise<GoogleAuthConfig> {
    try {
      const response = await this.api.get('/auth/google/config');
      const data = (response.data as { data?: Partial<GoogleAuthConfig> })?.data;
      return { enabled: data?.enabled === true && !!data?.clientId, clientId: data?.clientId ?? null };
    } catch {
      return { enabled: false, clientId: null };
    }
  }

  // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
  //   linkGoogle / getGoogleLinkStatus 는 은퇴했다. password 로 재인증하고 Google 을 붙이던
  //   전환기 경로이며, 세션 자체가 이미 Google 연결에서만 나온다.

  /**
   * WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1 §15 — 전환기 1회용 Admin Google Bootstrap.
   * 세션 없이 호출한다. 서버가 env 플래그 + 일회용 코드를 확인하고 `platform:super_admin` users.id 에 연결한다.
   * 실패(404 비활성 · 401 코드 오류 · 409 이미 연결/다른 사용자)는 axios 오류로 전파된다.
   */
  async bootstrapAdminGoogle(idToken: string, bootstrapCode: string): Promise<{ linked: boolean }> {
    const response = await this.api.post('/auth/google/bootstrap-admin', { idToken, bootstrapCode });
    const data = (response.data as { data?: { linked?: boolean } })?.data;
    return { linked: data?.linked === true };
  }

  /**
   * 세션 응답 채택 — /auth/login · /auth/google/login · /auth/google/signup 공통.
   * Server response format: { success: true, data: { user, tokens: { accessToken, refreshToken } } }
   */
  private adoptSessionResponse(rawData: { success?: boolean; data?: any }): GoogleAuthResponse {
    // WO-NETURE-AUTH-TOKEN-FAMILY-MISMATCH-FIX-V1:
    // Use shared helper for consistent token extraction
    const { accessToken, refreshToken } = extractTokensFromResponse(rawData);
    const user = rawData.data?.user;
    const expiresIn = rawData.data?.tokens?.expiresIn ?? rawData.data?.expiresIn;

    // Phase 6-7: Only store tokens locally for localStorage strategy
    if (this.strategy === 'localStorage' && accessToken) {
      setAccessToken(accessToken);
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }
      updateAuthStorage(accessToken, refreshToken);
      // WO-NETURE-TOKEN-RACE-FIX-V1:
      // Notify any queued subscribers with the new token so they can retry their requests.
      // Also reset refresh state so the concurrent stale refresh's catch block
      // won't mistake the new token as its own (tokenBeforeRefresh !== currentToken guard).
      if (this.isRefreshing) {
        this.refreshSubscribers.forEach(cb => cb(accessToken));
        this.refreshSubscribers = [];
        this.isRefreshing = false;
      }
    }

    // Return flattened AuthResponse for client consumption
    return {
      success: rawData.success ?? true,
      message: rawData.data?.message,
      accessToken,
      refreshToken,
      user,
      expiresIn,
      ...(typeof rawData.data?.isNewUser === 'boolean' && { isNewUser: rawData.data.isNewUser }),
      ...(rawData.data?.serviceMembership && { serviceMembership: rawData.data.serviceMembership }),
    };
  }

  /**
   * Logout
   *
   * Phase 6-7: Cookie Auth Primary
   * - Cookie strategy: Server clears httpOnly cookies
   * - localStorage strategy: Clear localStorage tokens
   */
  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout', {});
    } catch (error) {
      // Even if logout fails (e.g., token expired), continue with local cleanup
      // This is normal if token expired
    } finally {
      // Phase 6-7: Clear localStorage tokens for localStorage strategy
      // For cookie strategy, server handles cookie clearing
      if (this.strategy === 'localStorage') {
        this.endLocalSession();
      }
    }
  }

  /**
   * WO-O4O-NETURE-AUTH-ERROR-CONTRACT-AND-LEGACY-TOKEN-RECOVERY-FIX-V1:
   * 로컬 세션 종료 — 세대를 올려 진행 중인 refresh 응답을 무효화한 뒤 토큰을 지운다.
   * 지우기 전에 세대를 올려야 "clearAllTokens 직후 · 응답 도착 직전" 창에서도 저장이 막힌다.
   */
  private endLocalSession(): void {
    this.sessionGeneration += 1;
    clearAllTokens();
    this.rejectRefreshSubscribers();
  }

  /** refresh 시작 이후 세션이 끝났는가 — 같은 탭(세대) 또는 다른 탭(storage 의 refresh token 삭제) */
  private isSessionEndedSince(generationAtStart: number): boolean {
    return this.sessionGeneration !== generationAtStart || getRefreshToken() === null;
  }

  private rejectRefreshSubscribers(): void {
    const pending = this.refreshSubscribers;
    this.refreshSubscribers = [];
    pending.forEach((cb) => cb(null));
  }

  /**
   * Logout from all devices
   *
   * WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1:
   *   서버가 users.refreshTokenFamily 를 폐기하여 이미 발급된 모든 refresh token 을 무효화한다.
   *   실패는 호출부로 전파한다 (일반 logout 과 달리 조용히 삼키면 안 된다).
   */
  async logoutAll(): Promise<void> {
    try {
      await this.api.post('/auth/logout-all', {});
    } finally {
      if (this.strategy === 'localStorage') {
        this.endLocalSession();
      }
    }
  }

  /**
   * Check session status
   *
   * Phase 6-7: Works with both strategies
   * - Cookie strategy: Uses cookies sent automatically
   * - localStorage strategy: Uses Authorization header
   */
  async checkSession(): Promise<{ isAuthenticated: boolean; user?: any }> {
    try {
      const response = await this.api.get('/accounts/sso/check');
      return response.data;
    } catch (error) {
      return { isAuthenticated: false };
    }
  }

  /**
   * Get current auth strategy
   */
  getStrategy(): AuthStrategy {
    return this.strategy;
  }
}

// Singleton instance
// Use environment-specific API URL
const getApiUrl = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Try to get from environment variables first
    const envApiUrl = (window as any).__ENV__?.VITE_API_URL ||
                      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL);

    if (envApiUrl) {
      // Ensure /api/v1 suffix for all API calls
      return envApiUrl.endsWith('/api/v1') ? envApiUrl :
             envApiUrl.endsWith('/api') ? `${envApiUrl}/v1` :
             `${envApiUrl}/api/v1`;
    }

    // Auto-detect based on current location for development
    if (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('.local')) {
      return 'http://localhost:3002/api/v1';
    }
  }

  // Default to production API server with /api/v1 path
  return 'https://api.neture.co.kr/api/v1';
};

export const authClient = new AuthClient(getApiUrl());