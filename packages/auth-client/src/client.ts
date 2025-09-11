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
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('authToken');
            localStorage.removeItem('admin-auth-storage');
            
            // Redirect to login page
            if (typeof window !== 'undefined') {
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
// Use environment variable or default based on hostname
const getApiUrl = () => {
  // Always use production API server
  const DEFAULT_API_URL = 'https://api.neture.co.kr/api';
  
  if (typeof window === 'undefined') {
    return DEFAULT_API_URL;
  }
  
  // Check for environment variable first (Vite specific)
  try {
    // @ts-ignore - Vite environment variable
    if ((globalThis as any).import?.meta?.env?.VITE_API_URL) {
      // @ts-ignore
      return (globalThis as any).import.meta.env.VITE_API_URL;
    }
  } catch {
    // Ignore if import.meta is not available
  }
  
  // Check window global variable (for runtime config)
  if ((window as any).__API_URL__) {
    return (window as any).__API_URL__;
  }
  
  // Always return production API URL
  return DEFAULT_API_URL;
};

export const authClient = new AuthClient(getApiUrl());