import axios, { AxiosInstance, AxiosError } from 'axios';
import type { LoginCredentials, AuthResponse } from './types';

export class AuthClient {
  private baseURL: string;
  public api: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    }) as any;

    // Add auth token to requests
    this.api.interceptors.request.use((config: any) => {
      // Check multiple possible token locations
      // Priority: accessToken > token > authToken > admin-auth-storage
      let token = localStorage.getItem('accessToken') || 
                  localStorage.getItem('token') ||
                  localStorage.getItem('authToken');
      
      // Also check admin-auth-storage for token
      if (!token) {
        const authStorage = localStorage.getItem('admin-auth-storage');
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage);
            if (parsed.state?.accessToken || parsed.state?.token) {
              token = parsed.state.accessToken || parsed.state.token;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for auto-refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        
        // Check if error is 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for token refresh
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.api.request(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            
            if (refreshToken) {
              // Call refresh endpoint
              const refreshUrl = this.baseURL.includes('api.neture.co.kr') 
                ? 'https://api.neture.co.kr/api/auth/refresh'
                : `${this.baseURL}/auth/refresh`;
                
              const response = await axios.post(refreshUrl, { refreshToken });
              const { accessToken, refreshToken: newRefreshToken } = response.data as { accessToken: string; refreshToken?: string };
              
              // Update tokens
              localStorage.setItem('accessToken', accessToken);
              if (newRefreshToken) {
                localStorage.setItem('refreshToken', newRefreshToken);
              }
              
              // Update auth storage if exists
              const authStorage = localStorage.getItem('admin-auth-storage');
              if (authStorage) {
                try {
                  const parsed = JSON.parse(authStorage);
                  if (parsed.state) {
                    parsed.state.token = accessToken;
                    parsed.state.accessToken = accessToken;
                    if (newRefreshToken) {
                      parsed.state.refreshToken = newRefreshToken;
                    }
                    localStorage.setItem('admin-auth-storage', JSON.stringify(parsed));
                  }
                } catch {
                  // Ignore parse errors
                }
              }
              
              // Notify subscribers
              this.refreshSubscribers.forEach(callback => callback(accessToken));
              this.refreshSubscribers = [];
              
              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.api.request(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            this.clearAllTokens();
            
            // Show user-friendly message before redirect
            if (typeof window !== 'undefined') {
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

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // For production API server, use the correct auth endpoint
    let authUrl: string;
    if (this.baseURL.includes('api.neture.co.kr')) {
      // Production API server - use /api/auth/login
      authUrl = 'https://api.neture.co.kr/api/auth/login';
    } else {
      // Development - remove /api/v1 prefix for auth endpoints
      authUrl = `${this.baseURL.replace('/api/v1', '/api')}/auth/login`;
    }
    const response = await axios.post(authUrl, credentials);
    return response.data as AuthResponse;
  }

  // Clear all authentication tokens from all storage locations
  private clearAllTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('admin-auth-storage');
    
    // Also clear any cookies if present
    if (typeof document !== 'undefined') {
      document.cookie = 'accessToken=; Max-Age=0; path=/';
      document.cookie = 'refreshToken=; Max-Age=0; path=/';
    }
  }

  async logout(): Promise<void> {
    try {
      // For production API server, use the correct auth endpoint
      let authUrl: string;
      if (this.baseURL.includes('api.neture.co.kr')) {
        // Production API server - use /api/auth/logout
        authUrl = 'https://api.neture.co.kr/api/auth/logout';
      } else {
        // Development - remove /api/v1 prefix for auth endpoints
        authUrl = `${this.baseURL.replace('/api/v1', '/api')}/auth/logout`;
      }
      
      // Get token for authorization
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        await axios.post(authUrl, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      // Even if logout fails (e.g., token expired), continue with local cleanup
      console.log('Logout API call failed (this is normal if token expired):', error);
    }
  }

  async checkSession(): Promise<{ isAuthenticated: boolean; user?: any }> {
    try {
      const response = await this.api.get('/accounts/sso/check');
      return response.data;
    } catch (error) {
      return { isAuthenticated: false };
    }
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
      return envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`;
    }

    // Auto-detect based on current location for development
    if (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('.local')) {
      return 'http://localhost:3002/api';
    }
  }

  // Default to production API server
  return 'https://api.neture.co.kr/api';
};

export const authClient = new AuthClient(getApiUrl());