import axios, { AxiosInstance, AxiosError } from 'axios';
import type { LoginCredentials, AuthResponse } from './types.js';
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
  private refreshSubscribers: Array<(token: string) => void> = [];
  private strategy: AuthStrategy;

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
          if (requestUrl.includes('/auth/login') ||
              requestUrl.includes('/auth/register') ||
              requestUrl.includes('/auth/refresh')) {
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
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
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
              if (this.strategy === 'localStorage') {
                clearAllTokens();
              }
              return Promise.reject(new Error('Refresh response missing accessToken'));
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
              if (!freshLoginOccurred) {
                clearAllTokens();
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

  /**
   * Login with credentials
   *
   * Phase 6-7: Cookie Auth Primary
   * - Cookie strategy: Server sets httpOnly cookies, no tokens in response
   * - localStorage strategy: Server returns tokens in response body
   *
   * Server response format: { success: true, data: { user, tokens: { accessToken, refreshToken } } }
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Phase 6-7: For localStorage strategy, request tokens in body
    const payload = this.strategy === 'localStorage'
      ? { ...credentials, includeLegacyTokens: true }
      : credentials;

    const response = await this.api.post('/auth/login', payload);
    const rawData = response.data as { success?: boolean; data?: any };

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
        clearAllTokens();
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