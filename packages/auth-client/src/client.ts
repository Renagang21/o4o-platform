import axios, { AxiosInstance } from 'axios';
import type { LoginCredentials, AuthResponse } from './types';

export class AuthClient {
  private baseURL: string;
  public api: AxiosInstance;

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
      let token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
      
      // Also check auth-storage for token
      if (!token) {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage);
            if (parsed.state?.token) {
              token = parsed.state.token;
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
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Remove /api/v1 prefix from baseURL for auth endpoints
    const authUrl = this.baseURL.replace('/api/v1', '/api');
    const response = await axios.post(`${authUrl}/auth/login`, credentials);
    return response.data as AuthResponse;
  }

  async logout(): Promise<void> {
    // Remove /api/v1 prefix from baseURL for auth endpoints
    const authUrl = this.baseURL.replace('/api/v1', '/api');
    await axios.post(`${authUrl}/auth/logout`);
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
  const DEFAULT_API_URL = 'https://api.neture.co.kr/api/v1';
  
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