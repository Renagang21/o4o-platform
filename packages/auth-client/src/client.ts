import { refreshStoredSession } from './refresh-coordinator.js';
import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  AuthResponse,
  GoogleAuthResponse,
  GoogleAuthConfig,
  GoogleSignupConsents,
  EmailSignupRequest,
  EmailAuthNotice,
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
 * - 'cookie':       httpOnly 쿠키. 이 클라이언트의 기본값이며 **admin-dashboard 가 쓴다.**
 * - 'localStorage': body 로 받은 토큰을 localStorage 에 둔다.
 *
 * WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1 — 이름 정정:
 *   `'localStorage'` 는 **legacy 가 아니라 현행**이다. 웹 서비스 8개
 *   (neture · k-cosmetics · kpa-society · pharmacy-hub · kpa-branch · store · lecture ·
 *   hospital-pharmacy)가 이 전략으로 로그인한다. 종전 주석의 "legacy, for specific use cases"
 *   는 사실과 반대여서 제거 후보로 오판될 소지가 있었다(IR §5).
 *   `includeLegacyTokens` 플래그도 이 전략이 **지금 동작하기 위해** 보내는 값이다.
 *   전략 자체의 변경(cookie 단일화)은 별도 트랙이며 이 WO 의 범위가 아니다.
 *
 * @see docs/architecture/auth-ssot-declaration.md
 */
export type AuthStrategy = 'cookie' | 'localStorage';

export interface AuthClientOptions {
  /**
   * Authentication strategy
   * - 'cookie':       httpOnly 쿠키 (기본값 · admin-dashboard)
   * - 'localStorage': body 토큰 + localStorage (웹 서비스 8개의 **현행** 경로)
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
   * 로그아웃(명시적 logout · refresh 실패 정리)마다 증가하는 세션 세대.
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
        if (token && !config.headers.Authorization) {
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
          const generationAtStart = this.sessionGeneration;

          try {
            // Phase 6-7: Cookie Auth Primary
            let accessToken: string | null;
            if (this.strategy === 'localStorage') {
              accessToken = await refreshStoredSession(this.baseURL, async (refreshToken) => {
                const response = await this.api.post('/auth/refresh', { refreshToken, includeLegacyTokens: true });
                return response.data;
              });
            } else {
              // Cookie-only success need not expose tokens in the JSON body.
              await this.api.post('/auth/refresh', {});
              accessToken = 'cookie-session-refreshed';
            }
            if (!accessToken) {
              throw new Error(this.isSessionEndedSince(generationAtStart)
                ? 'Refresh response discarded: session ended during refresh'
                : 'Refresh response discarded or missing tokens');
            }
            if (this.sessionGeneration !== generationAtStart) {
              this.rejectRefreshSubscribers();
              return Promise.reject(new Error('Refresh response discarded: session ended during refresh'));
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
            this.rejectRefreshSubscribers();
            const status = (refreshError as { response?: { status?: number } })?.response?.status;
            // Local tokens/events are owned by the coordinator. Cookie sessions
            // end only on definitive rejection, never on a network/DB outage.
            if (this.strategy === 'cookie' && generationAtStart === this.sessionGeneration &&
                (status === 401 || status === 403)) {
              this.sessionGeneration += 1;
              if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:token-cleared'));
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
    const generation = ++this.sessionGeneration;
    const response = await this.api.post('/auth/google/login', {
      idToken,
      ...(options.serviceKey && { serviceKey: options.serviceKey }),
      ...(this.strategy === 'localStorage' && { includeLegacyTokens: true }),
    });
    if (generation !== this.sessionGeneration) throw new Error('Login response discarded: session changed');
    return this.adoptSessionResponse(response.data as { success?: boolean; data?: any });
  }

  /**
   * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D)
   * Google ID token + 약관/개인정보(+마케팅) 동의 → POST /auth/google/signup → 계정 생성 + 세션.
   */
  async signupWithGoogle(idToken: string, consents: GoogleSignupConsents): Promise<GoogleAuthResponse> {
    const generation = ++this.sessionGeneration;
    const response = await this.api.post('/auth/google/signup', {
      idToken,
      consents,
      ...(this.strategy === 'localStorage' && { includeLegacyTokens: true }),
    });
    if (generation !== this.sessionGeneration) throw new Error('Login response discarded: session changed');
    return this.adoptSessionResponse(response.data as { success?: boolean; data?: any });
  }

  // ── WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1: 이메일·비밀번호 ──────────────────────────
  //   옛 `login(email,password)` 의 부활이 아니다 — 새 경로 `/auth/email/*` · `/auth/password/*` 이며
  //   세션 채택은 Google 과 같은 `adoptSessionResponse` 한 곳이다. 비밀번호·토큰은 로그·저장소에 두지 않는다.

  /** POST /auth/email/login — 확인된 이메일 계정 → 세션. 실패는 axios 오류로 전파(code: INVALID_CREDENTIALS · EMAIL_NOT_VERIFIED …). */
  async loginWithEmail(email: string, password: string): Promise<GoogleAuthResponse> {
    const generation = ++this.sessionGeneration;
    const response = await this.api.post('/auth/email/login', {
      email,
      password,
      ...(this.strategy === 'localStorage' && { includeLegacyTokens: true }),
    });
    if (generation !== this.sessionGeneration) throw new Error('Login response discarded: session changed');
    return this.adoptSessionResponse(response.data as { success?: boolean; data?: any });
  }

  /** POST /auth/email/signup — 계정 생성 + 확인 메일. **세션을 열지 않는다.** */
  async signupWithEmail(request: EmailSignupRequest): Promise<EmailAuthNotice> {
    const response = await this.api.post('/auth/email/signup', request);
    return ((response.data as { data?: EmailAuthNotice })?.data ?? {}) as EmailAuthNotice;
  }

  /** POST /auth/email/verify — 메일 링크의 토큰으로 주소 확인(자동 로그인 없음). */
  async verifyEmail(token: string): Promise<EmailAuthNotice> {
    const response = await this.api.post('/auth/email/verify', { token });
    return ((response.data as { data?: EmailAuthNotice })?.data ?? {}) as EmailAuthNotice;
  }

  /** POST /auth/email/resend — 확인 메일 재발송(계정 존재 여부와 무관하게 같은 응답). */
  async resendVerificationEmail(email: string): Promise<EmailAuthNotice> {
    const response = await this.api.post('/auth/email/resend', { email });
    return ((response.data as { data?: EmailAuthNotice })?.data ?? {}) as EmailAuthNotice;
  }

  /** POST /auth/password/forgot — 재설정 메일(계정 존재 여부와 무관하게 같은 응답). */
  async requestPasswordReset(email: string): Promise<EmailAuthNotice> {
    const response = await this.api.post('/auth/password/forgot', { email });
    return ((response.data as { data?: EmailAuthNotice })?.data ?? {}) as EmailAuthNotice;
  }

  async getPasswordStatus(): Promise<{ hasPassword: boolean; canManage: boolean }> {
    const response = await this.api.get('/auth/password');
    return response.data.data;
  }

  async setPassword(input: { currentPassword?: string; newPassword: string }): Promise<void> {
    await this.api.post('/auth/password', input);
    if (this.strategy === 'localStorage') this.endLocalSession();
    else { this.sessionGeneration += 1; this.rejectRefreshSubscribers(); }
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:token-cleared'));
  }

  /** POST /auth/password/reset — 새 비밀번호 저장 + 모든 기기 로그아웃. */
  async resetPassword(token: string, newPassword: string): Promise<EmailAuthNotice> {
    const response = await this.api.post('/auth/password/reset', { token, newPassword });
    if (this.strategy === 'localStorage') this.endLocalSession();
    else { this.sessionGeneration += 1; this.rejectRefreshSubscribers(); }
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:token-cleared'));
    return ((response.data as { data?: EmailAuthNotice })?.data ?? {}) as EmailAuthNotice;
  }

  /** POST /auth/account/find-id — 이름 + 휴대전화 → 가린 이메일 힌트. */
  async findLoginId(name: string, phone: string): Promise<EmailAuthNotice> {
    const response = await this.api.post('/auth/account/find-id', { name, phone });
    return ((response.data as { data?: EmailAuthNotice })?.data ?? {}) as EmailAuthNotice;
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

  // WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1: Admin Google Bootstrap(전환기 1회용)은 은퇴했다.
  //   목적이던 "기존 관리자 users.id 에 Google 연결"은 완료됐고 1회용이라 재사용 경로가 없다.
  //   운영 env 에 플래그/코드가 없어 이미 fail-closed 로 닫혀 있었다.

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
    const token = this.strategy === 'localStorage' ? getAccessToken() : null;
    if (this.strategy === 'localStorage') this.endLocalSession();
    else { this.sessionGeneration += 1; this.rejectRefreshSubscribers(); }
    // Local logout has already completed; preserve any server revocation failure.
    await this.api.post('/auth/logout', {}, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
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
    return this.sessionGeneration !== generationAtStart || (this.strategy === 'localStorage' && getRefreshToken() === null);
  }

  private rejectRefreshSubscribers(): void {
    const pending = this.refreshSubscribers;
    this.refreshSubscribers = [];
    pending.forEach((cb) => cb(null));
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
