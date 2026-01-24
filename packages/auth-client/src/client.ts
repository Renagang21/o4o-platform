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

          try {
            // Phase 6-7: Cookie Auth Primary
            // For cookie strategy, refresh token is sent via cookie automatically
            // For localStorage strategy, send refresh token in body
            const refreshPayload = this.strategy === 'localStorage'
              ? { refreshToken: getRefreshToken(), includeLegacyTokens: true }
              : {}; // Cookie strategy sends refresh token via cookie

            const response = await this.api.post('/auth/refresh', refreshPayload);
            const { accessToken, refreshToken: newRefreshToken } = response.data as { accessToken?: string; refreshToken?: string };

            // Phase 6-7: Only update localStorage for localStorage strategy
            if (this.strategy === 'localStorage' && accessToken) {
              setAccessToken(accessToken);
              if (newRefreshToken) {
                setRefreshToken(newRefreshToken);
              }
              updateAuthStorage(accessToken, newRefreshToken);
            }

            // Notify subscribers
            this.refreshSubscribers.forEach(callback => callback(accessToken || ''));
            this.refreshSubscribers = [];

            // Retry original request
            if (this.strategy === 'localStorage' && accessToken) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            return this.api.request(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear tokens
            if (this.strategy === 'localStorage') {
              clearAllTokens();
            }

            // Don't redirect if already on login page
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              const errorData = (refreshError as any)?.response?.data;
              if (errorData?.code === 'TOKEN_EXPIRED') {
                console.warn('Session expired, redirecting to login');
              } else {
                console.warn('Authentication failed, redirecting to login');
              }

              // Redirect to login page
              window.location.href = '/login';
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
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Phase 6-7: For localStorage strategy, request tokens in body
    const payload = this.strategy === 'localStorage'
      ? { ...credentials, includeLegacyTokens: true }
      : credentials;

    const response = await this.api.post('/auth/login', payload);
    const data = response.data as AuthResponse;

    // Phase 6-7: Only store tokens locally for localStorage strategy
    if (this.strategy === 'localStorage' && data.accessToken) {
      setAccessToken(data.accessToken);
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken);
      }
      updateAuthStorage(data.accessToken, data.refreshToken);
    }

    return data;
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